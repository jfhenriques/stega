// var fs = require('fs'),
//     PNG = require('pngjs').PNG;

// fs.createReadStream('in.png')
//     .pipe(new PNG({
//         filterType: 1,
//         deflateStrategy: 1,
//         deflateLevel: 9

//     }))
//     .on('parsed', function() {

//         for (var y = 0; y < this.height; y++) {
//             for (var x = 0; x < this.width; x++) {
//                 var idx = (this.width * y + x) << 2;

//                 // invert color
//                 this.data[idx] = 255 - this.data[idx];
//                 this.data[idx+1] = 255 - this.data[idx+1];
//                 this.data[idx+2] = 255 - this.data[idx+2];

//                 // and reduce opacity
//                 this.data[idx+3] = 255; //this.data[idx+3] >> 1;
//             }
//         }

//         this.pack().pipe(fs.createWriteStream('out.png'));
//     });


var crypto = require('crypto'),
    secret = crypto.createHash('sha256').update('Secret password XPTO').digest('binary'),
    iv = crypto.randomBytes(16),
    cipher = crypto.createCipheriv("AES-256-CBC", secret, iv),
    decipher = crypto.createDecipheriv("AES-256-CBC", secret, iv),
    enc = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789'; //crypto.randomBytes(32);

 cipher.setAutoPadding(true);

var step  = cipher.update(enc, 'utf-8', 'binary') + cipher.final('binary');

var end  = decipher.update(step, 'binary', 'utf-8') + decipher.final('utf-8');

console.log((new Buffer(step, 'binary')).toString('hex'));
console.log(end);
