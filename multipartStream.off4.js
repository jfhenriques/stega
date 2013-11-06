

var Busboy = require('busboy'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');


function onData(name, val, data)
{
  if (Array.isArray(data[name]))
    data[name].push(val);

  else
  if (data[name])
    data[name] = [data[name], val];
  
  else
    data[name] = val;
}



module.exports = function(req, res, next) {

    var infiles = 0, outfiles = 0, done = false,
        busboy = new Busboy({ headers: req.headers });

    console.log('Start parsing form ...');
    

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
  var fstream = fs.createWriteStream(path.join(os.tmpDir(), path.basename(filename)));
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

