

var Busboy = require('busboy'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

module.exports = function(req, res, next) {

    var infiles = 0, outfiles = 0, done = false,
        busboy = new Busboy({ headers: req.headers });

    console.log('Start parsing form ...');

    busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {

      console.log(fieldname, val);
    });
    
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      ++infiles;
      onFile(fieldname, file, filename, function() {
        ++outfiles;
        if (done)
          console.log(outfiles + '/' + infiles + ' parts written to disk');

        if (done && infiles === outfiles) {
          // ACTUAL EXIT CONDITION
          console.log('All parts written to disk');
          
          next();
        }
      });
    });
    busboy.on('end', function() {
      console.log('Done parsing form!');
      done = true;
    });
    req.pipe(busboy);

}

function onFile(fieldname, file, filename, cb) {


  // or save at some other location
  var fstream = fs.createWriteStream(path.join('tmp', path.basename(filename)));
  file.on('end', function() {
    console.log(fieldname + '(' + filename + ') EOF');
  });
  fstream.on('close', function() {
    console.log(fieldname + '(' + filename + ') written to disk');
    cb();
  });
  console.log(fieldname + '(' + filename + ') start saving');
  file.pipe(fstream);
}

