
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



/**********************************************************************************************************/

function createHelperArray(startSeed, totalPixels)
{
	var i,j,temp,
		arr = [],
		size,
		rand = seed(startSeed.toString('hex')),
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
	BAD_DECRYPT		 : 5,
	WRONG_SIZE		 : 6,
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


	var setPtr = function(pixel, bit)
	{
		if( pixel !== undefined )
			pixelPtr = pixel;

		if( bit !== undefined )
			pixelBit = bit;
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

	var read = function(buff, length)
	{
		var byteShift = 8,
			nByte = -1,
			curBitPos,
			bitMask,
			bitMaskCheck;

		function _setMasks()
		{
			bitMaskCheck = (0x1 << pixelBit);
		}
		_setMasks();

		for ( ;; )
		{
			// Get current byte from buffer
			if( byteShift < 7 ) byteShift++;
			else
			{
				if( (++nByte) >= length ) break;

				byteShift = 0;
			}

			curBitPos = _nextPos(_setMasks);
			bitMask = (0x1 << byteShift);

			if( self.png.data[ curBitPos ] & bitMaskCheck )
				buff[nByte] |= bitMask;

			else
				buff[nByte] &= ~bitMask;

			//console.log("Byte[nr: " + nByte + "|code: " + cByte + "] = [b:  " + byteShift + "|pos: " + curBitPos+ "|p: " + pixelBit  + "]");
		}
	}



	reset();

	return { reset: reset, write: write, read: read, setPtr: setPtr };
}



StegaCrypt.prototype._savePngOutput = function(outputTo)
{
	if( outputTo == undefined )
		outputTo = [];

	if( typeof outputTo == 'string' )
	{
		this.png.pack().pipe( fs.createWriteStream(outputTo) );

		this.emit('done');
	}
	else
	{
		var isBufferOutput = (outputTo instanceof Array) ;
		
		this.png.on('data', function(data) {

			if( isBufferOutput )
				outputTo.push(data);
			else
				outputTo.write(data);
		});

		this.png.on('end', function() {

			this.emit('done', isBufferOutput ? Buffer.concat(outputTo) : undefined );
		}.bind(this));
		
		this.png.pack();
	}
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
		process.nextTick(function() {

			var inp    = (input instanceof Buffer) ? input : new Buffer(input, 'utf-8'),
				needed = StegaCrypt.calculateNeeded( inp.length );

			if( needed > this.available )
				this.emit('error', StegaCrypt.STATE.NOT_ENOUGHT_BYTES, 'Not enought space available');

			else
			{

				var iv = new Buffer(crypto.randomBytes(IV_LEN)),
					passHash = crypto.createHmac(HASH_ALGO, HMAC_KEY).update(pass).digest('binary'),
					cipher = crypto.createCipheriv(CYPHER_ALGO, passHash, iv),
					enc = Buffer.concat([cipher.update(inp), cipher.final()]),

					lenBuff = new Buffer(4),
					ctrlByte = new Buffer(1),
					posArr = createHelperArray(iv, this.totalPixels),
					pixel = this.pixelator();

				lenBuff.writeUInt32LE(enc.length, 0);
				ctrlByte.writeUInt8(this.bits, 0);

				// Write IV and control bit
				pixel.write(iv);
				pixel.write(ctrlByte);

				// Reset pixelator to use a position Array
				pixel.reset(posArr);

				// Write the size of encrypted data, and the encrypted data
				pixel.write(lenBuff);
				pixel.write(enc);

				this._savePngOutput(output);
			}

		}.bind(this));
	}
}



StegaCrypt.prototype.decode = function(pass, output)
{
	if( !this.parsed )
		this.emit('error', StegaCrypt.STATE.NOT_PARSED, 'Image not parsed');

	else
	if( pass   == undefined )
		this.emit('error', StegaCrypt.STATE.WRONG_PARAMETERS, 'Wrong input parameters');

	else
	{
		process.nextTick(function() {

			var passHash = crypto.createHmac(HASH_ALGO, HMAC_KEY).update(pass).digest('binary'),
				pixel = this.pixelator(),
				ivBuff = new Buffer(IV_LEN),
				ctrlByte = new Buffer(1),
				lenBuff = new Buffer(4),
				posArr,
				encBuff,
				decipher, dec;

			pixel.read(ivBuff, ivBuff.length);
			pixel.read(ctrlByte, ctrlByte.length);

			posArr = createHelperArray(ivBuff, this.totalPixels),

			pixel.reset(posArr);
			
			pixel.read(lenBuff, lenBuff.length);

			lenBuff = lenBuff.readUInt32LE(0);
			this.bits = ctrlByte.readUInt8(0);

			if( this.bits > 1 || this.bits <= 4 )
				this.available = this.calculateAvailable(this.totalPixels);

			if( lenBuff > this.available )
				this.emit('error', StegaCrypt.STATE.WRONG_SIZE, 'Bad size. Maybe the image has no data hidden');

			else
			{
				encBuff = new Buffer(lenBuff);

				pixel.read(encBuff, encBuff.length);

				try {

					decipher = crypto.createDecipheriv(CYPHER_ALGO, passHash, ivBuff);
					dec = Buffer.concat([decipher.update(encBuff), decipher.final()]),

					this.emit('done', dec);

				} catch(err) {
					this.emit('error', StegaCrypt.STATE.BAD_DECRYPT, 'Bad Password, or image as no data hidden');
				}
			}

		}.bind(this));
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

