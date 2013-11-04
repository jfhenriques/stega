
var fs = require('fs'),
	PNG = require('pngjs').PNG,
	crypto = require('crypto'),
	seed = require('./seedrandom'),
	events = require('events'),
	util = require('util'),

	HASH_ALGO = 'sha256',
	HMAC_KEY = 'I like steganography in node.js',
	CYPHER_ALGO = 'AES-256-CBC',
	ALGO_BLOCK_SIZE = ( 128 / 8 ) | 0,
	IV_LEN = 16,

	HEADER_BIT_LEN = ( IV_LEN * 8 ) + 8 ;
	HEADER_REAL_BIT_LEN = Math.ceil( HEADER_BIT_LEN / 3 ) * 4;



// var 
//     secret = crypto.createHash(HASH).update('Secret password XPTO').digest('binary'),
//     iv = crypto.randomBytes(IV_LEN),
//     cipher = crypto.createCipheriv("", secret, iv),
//     decipher = crypto.createDecipheriv("AES-256-CBC", secret, iv),
//     enc = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789'; //crypto.randomBytes(32);

//  cipher.setAutoPadding(true);

// var step  = ;

// var end  = decipher.update(step, 'binary', 'utf-8') + decipher.final('utf-8');

// console.log((new Buffer(step, 'binary')).toString('hex'));
// console.log(end);


/**********************************************************************************************************/

function createHelperArray(startSeed, totalPixels)
{
	var i,j,temp,
		arr = [],
		size,
		rand = seed(startSeed),
		totalBits = (totalPixels * 4);

	for(i = HEADER_REAL_BIT_LEN; i < totalBits ; i++)
	{
		// Don't include alpha channel
		if( (i % 4) < 3 )
			arr.push(i);
	}

	size = arr.length - 1 ;

	for (i = size; i > 0; i--)
	{
		j = Math.floor(rand() * (i - 1));
		temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}

	return arr;
}


/**********************************************************************************************************/


var StegaCrypt = module.exports = function(fileIn, bits)
{
	events.EventEmitter.call(this);

	this.parsed = false;
	this.bits = ( bits == undefined || bits > 4 ) ? 1 : ( bits | 0 ) ;

	var self = this;

	process.nextTick(function() {

		if( fileIn == undefined )
			self.emit('error', StegaCrypt.STATE.WRONG_PARAMETERS, 'Input file not defined');

		else
		{
			self.png = new PNG({
						filterType: 0,
						deflateStrategy: 2,
						deflateLevel: 9
					});

			var src = fs.createReadStream(fileIn);

			self.png.on('error', function() {

				self.emit('error', StegaCrypt.STATE.NOT_COMPATIBLE, 'Image not supported');
			});

			self.png.on('parsed', function() {

				self.totalPixels = this.width * this.height;
				self.available = self.calculateAvailable( self.totalPixels );
				self.parsed = true;

				self.emit('parsed');
			});

			src.pipe(self.png);
		}
	});
}

util.inherits(StegaCrypt, events.EventEmitter);


StegaCrypt.STATE = {
	OK 				 : 0,
	NOT_PARSED	 	 : 1,
	NOT_COMPATIBLE 	 : 2,
	WRONG_PARAMETERS : 3,
	NOT_ENOUGHT_BYTES: 4,
};


StegaCrypt.prototype.pixelator = function(posArr)
{
	var	pixelPtr = 0,
		pixelBit = 0,
		posArr = posArr,
		self = this,
		uppIndexLimit;


	function _overReset(callback)
	{
		if( pixelPtr >= uppIndexLimit )
		{
			pixelPtr = 0;
			pixelBit++;

			if( callback )
				callback();
		}
	}

	function _nextPos(overFlowCallback)
	{
		var out;

		_overReset(overFlowCallback);

		if( posArr !== undefined )
			out = posArr[pixelPtr] ;

		else
		{
			// Skip alpha channel
			if( ( pixelPtr % 4 ) == 3 )
				pixelPtr++;

			out = pixelPtr;
		}

		pixelPtr++;

		return out;
	}


	var reset = function(posArrIn)
	{
		pixelPtr = 0
		pixelBit = 0;

		if( posArrIn !== undefined )
			posArr = ( posArrIn == null ) ? undefined : posArrIn ;
		
		uppIndexLimit = ( posArr == undefined ) ? ( this.totalPixels*4 ) : posArr.length;
	}

	var write = function(buff)
	{
		var byteShift = 8,
			nByte = -1,
			cByte,
			curBitPos,
			bitMaskSet,
			bitMaskClear;

		function _setMasks()
		{
			bitMaskSet	 = (0x1 << pixelBit)
			bitMaskClear = ~bitMaskSet;
		}
		_setMasks();

		for ( ;; )
		{
			// Get current byte from buffer
			if( byteShift < 7 ) byteShift++;
			else
			{
				if( (++nByte) >= buff.length ) break;

				cByte = buff[nByte];
				byteShift = 0;
			}

			curBitPos = _nextPos(_setMasks);

			if( ( cByte >> byteShift ) & 0x1 )
				self.png.data[ curBitPos ] |= bitMaskSet;

			else
				self.png.data[ curBitPos ] &= bitMaskClear;

			//console.log("Byte[nr: " + nByte + "|code: " + cByte + "] = [b:  " + byteShift + "|pos: " + curBitPos+ "|p: " + pixelBit  + "]");
		}
	}


	reset();

	return { reset: reset, write: write };
}

StegaCrypt.prototype.encode = function(input, pass, output)
{
	if( !this.parsed )
		this.emit('error', StegaCrypt.STATE.NOT_PARSED, 'Image not parsed');

	else
	if(    input  == undefined
		|| pass   == undefined )
		this.emit('error', StegaCrypt.STATE.WRONG_PARAMETERS, 'Wrong input parameters');

	else
	{
		var self = this;

		process.nextTick(function() {

			var inp    = (input instanceof Buffer) ? input : new Buffer(input, 'utf-8'),
				needed = StegaCrypt.calculateNeeded( inp.length );

			if( needed > self.available )
				self.emit('error', StegaCrypt.STATE.NOT_ENOUGHT_BYTES, 'Not enought space available');

			else
			{

				var iv = new Buffer(crypto.randomBytes(IV_LEN)),
					passHash = crypto.createHmac(HASH_ALGO, HMAC_KEY).update(pass).digest('binary'),
					cipher = crypto.createCipheriv(CYPHER_ALGO, passHash, iv),
					enc = Buffer.concat([cipher.update(inp), cipher.final()]),

					lenBuff = new Buffer(4),
					ctrlBuff = new Buffer(1),
					posArr = createHelperArray(iv, self.totalPixels),
					pixel = self.pixelator();


				lenBuff.writeUInt32LE(enc.length, 0);
				ctrlBuff.writeUInt8(0x0, 0);

				// Write IV and control bit
				pixel.write(iv, true);
				pixel.write(ctrlBuff, true);

				// Reset pixelator to use position Array
				pixel.reset(posArr);

				// Write size of encrypted data, and encrypted data
				pixel.write(lenBuff);
				pixel.write(enc);


				if( output == undefined )
					output = [];

				if( typeof output == 'string' )
				{
					self.png.pack().pipe( fs.createWriteStream(output) );

					self.emit('done');
				}
				else
				{
					var isBufferOutput = (output instanceof Array) ;
					
					self.png.on('data', function(data) {

						if( isBufferOutput )
							output.push(data);
						else
							output.write(data);
					});

					self.png.on('end', function() {

						self.emit('done', isBufferOutput ? Buffer.concat(output) : undefined );
					});
					
					self.png.pack();
				}
			}

		});
	}
}




StegaCrypt.calculateNeeded = function(byteLen)
{    
	return ALGO_BLOCK_SIZE * Math.ceil( byteLen / ALGO_BLOCK_SIZE ) ;
}; 

StegaCrypt.prototype.calculateAvailable = function(pixels)
{
	pixels -= Math.ceil( HEADER_REAL_BIT_LEN / 3 ) ;
	pixels *= ( 3 * this.bits ) ;

	var avail = Math.floor( pixels / 8 ) - 4;

	return ALGO_BLOCK_SIZE * Math.floor( avail / ALGO_BLOCK_SIZE ) ;
}

