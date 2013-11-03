
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

	IV_BIT_LEN = IV_LEN * 8,
	IV_BIT_REAL_LEN = ( Math.ceil( IV_BIT_LEN / 3 ) * 4 ) | 0;

var ALL_BIT_ONE_MASK = ~0,
	LAST_BIT_ZERO_MASK = ~1;


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
		totalBits = (totalPixels * 4) ;

	for(i = IV_BIT_REAL_LEN; i < totalBits ; i++)
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


var StegaCrypt = module.exports = function(fileIn)
{
	events.EventEmitter.call(this);

	this.parsed = false;

	var self = this;

	process.nextTick(function() {

		if( fileIn == undefined )
			self.emit('error', StegaCrypt.STATE.WRONG_PARAMETERS, 'Input file not defined');

		else
		{
			self.png = new PNG({
						filterType: 1,
						deflateStrategy: 1,
						deflateLevel: 9
					});

			var src = fs.createReadStream(fileIn);

			self.png.on('error', function() {

				self.emit('error', StegaCrypt.STATE.NOT_COMPATIBLE, 'Image not supported');
			});

			self.png.on('parsed', function() {

				self.totalPixels = this.width * this.height;
				self.available = StegaCrypt.calculateAvailable( self.totalPixels );
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




StegaCrypt.prototype.encode = function(input, pass, output, callback)
{
	if( !this.parsed )
		this.emit('error', StegaCrypt.STATE.NOT_PARSED, 'Image not parsed');

	else
	{
		var isBufferOutput = false;

		if( callback == undefined )
		{
			callback = output;
			output = [];

			isBufferOutput = true;
		}

		if( typeof callback !== 'function' )
			this.emit('error', StegaCrypt.STATE.WRONG_PARAMETERS, 'Callback is not a function');

		else
		if(    ( !isBufferOutput && output == undefined )
			|| input  == undefined
			|| pass   == undefined )
			callback(StegaCrypt.STATE.WRONG_PARAMETERS, 'Wrong input parameters');

		else
		{
			var self = this;

			process.nextTick(function() {

				var inp = (input instanceof Buffer) ? input : new Buffer(input, 'utf-8'),
					needed = StegaCrypt.calculateNeeded( inp.length );

				if( needed > self.available )
					callback(StegaCrypt.STATE.NOT_ENOUGHT_BYTES, 'Not enought space available');

				else
				{
					var curByte = -1;

					function writePixels(buff, shuffle) {

						var bitCount = 0,
							bitNr = 8,
							byteNr = -1,
							bitMask,
							curPos;

						for (;;)
						{
							if( bitNr < 7 )
								bitNr++;

							else
							{
								if( (++byteNr) >= buff.length )
									break;

								curByte = buff[byteNr];
								bitNr = 0;
							}
								
							bitMask = ( !((curByte >> bitNr ) & 0x1) ) ? LAST_BIT_ZERO_MASK : ALL_BIT_ONE_MASK ;

							if( shuffle !== undefined )
								curPos = shuffle[bitCount] ;

							else
							{
								// Skip alpha channel
								if( ( bitCount % 4 ) == 3 )
									bitCount++;

								curPos = bitCount;
							}

							//self.png.data[ curPos[bitCount] ] &= bitMask;
							self.png.data[ curPos ] = 0;

							//console.log("Byte[nr: " + byteNr + "|code: " + curByte + "] = [bit:  " + bitNr + "|cont: " + bitMask + "]");

							bitCount++;
						}

					}

					var iv = new Buffer(crypto.randomBytes(IV_LEN)),
						passHash = crypto.createHmac(HASH_ALGO, HMAC_KEY).update(pass).digest('binary'),
						cipher = crypto.createCipheriv(CYPHER_ALGO, passHash, iv),
						enc = Buffer.concat([cipher.update(inp), cipher.final()]),

						posArr = createHelperArray(iv, self.totalPixels);


					curByte = -1;
					writePixels(iv);

					curByte = -1;
					writePixels(enc, posArr);

					if(    isBufferOutput
						|| typeof output === 'object' )
					{
						self.png.on('data', function(data) {
							if( isBufferOutput )
								output.push(data);
							else
								output.write(data);
						});

						self.png.on('end', function() {
							if ( isBufferOutput )
								callback(StegaCrypt.STATE.OK, Buffer.concat(output));
							else
								callback(StegaCrypt.STATE.OK);
						});
						
						self.png.pack();
					}
					else
					{
						self.png.pack().pipe( fs.createWriteStream(output) );
						callback(StegaCrypt.STATE.OK);
					}
				}

			});
		}
	}
}







StegaCrypt.calculateNeeded = function(byteLen)
{    
	byteLen = Math.ceil( byteLen / ALGO_BLOCK_SIZE ) | 0;

	return byteLen * ALGO_BLOCK_SIZE ;
};

StegaCrypt.calculateAvailable = function(pixels)
{
	return ( Math.floor( (pixels * 3) / 8 ) | 0 ) - IV_LEN;
}

