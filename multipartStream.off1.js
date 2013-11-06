

var Busboy = require('busboy'),
	fs = require('fs'),
	stream = require('stream');


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


function onFile(file, filename, cb) {

  // or save at some other location

  var fstream = fs.createWriteStream(filename);

  file.on('end', function() {

    console.log( '(' + filename + ') EOF');
  });
  file.on('data', function() {

    console.log( '(' + filename + ') ~~~~~~');
  });

  fstream.on('close', function() {
    console.log( '(' + filename + ') written to disk');
    cb();
  });


  console.log( '(' + filename + ') start saving');
  file.pipe(fstream);

	// var pStream = stream.PassThrough();


	// file.on('data', function(data) {

	// 	console.log('data-data');
	// });

	// file.on('end', function() {
	// 	console.log('--data-end');


	// 	cb(pStream);
	// });

	// file.on('close', function() {
	// 	console.log("what ?");
	// });

	// 	pStream.on('close', function() {
	// 	console.log("what ?");
	// });
	// fstream.on('close', function() {
	//   console.log(fieldname + '(' + filename + ') written to disk');
	//   next();
	// });

	//file.pipe(pStream);
}


module.exports = function(req, res, next)
{

	var busboy = new Busboy({ headers: req.headers });
		fields = {},
		files = {},
		outFiles = 0,
		inFiles = 0
		done = false;

	req.multipartError = false;
	req.body = {};
	req.files = {};

	function _maybeEnd()
	{
		console.log('Maybe end? ');

		if(done && outFiles === inFiles)
		{
			console.log('* ended!!');
			req.body = fields;
			req.files = files;

			next();
		}
	}


	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {

		if( fieldname )
			onData(fieldname, val, fields);
	});


	busboy.on('end', function() {

		done = true;

		console.log("-----boy-end------");

		_maybeEnd();
	});

	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

		console.log("boy-file-"+fieldname+"-"+filename);

		// if( !fieldname )
		// 	file.end();

		// else
		// {
			outFiles++;
			console.log(outFiles + "/" + inFiles + "+");

			onFile(file, filename, function(s) {

				// 

				inFiles++;

				console.log(outFiles + "/" + inFiles + "-");

				// s.filename = filename;
				// s.contentType = mimetype;
				// s.encoding = encoding;

				// onData(fieldname, s, files);

				_maybeEnd();
			});
		// }
	});



	
	try {
		req.pipe(busboy);

	} catch(error) {
		req.multipartError = error;
		console.log("error: " + error);

		next();
	}

}










// function onFile(fieldname, file, filename, next) {
//   // or save at some other location
//   var fstream = fs.createWriteStream(filename);
//   file.on('end', function() {
//     console.log(fieldname + '(' + filename + ') EOF');
//   });
//   fstream.on('close', function() {
//     console.log(fieldname + '(' + filename + ') written to disk');
//     next();
//   });
//   console.log(fieldname + '(' + filename + ') start saving');
//   file.pipe(fstream);
// }


// module.exports = function(req, res, next)
// {
// 	 var infiles = 0, outfiles = 0, done = false,
//         busboy = new Busboy({ headers: req.headers });
//     console.log('Start parsing form ...');
//     busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
//       ++infiles;
//       onFile(fieldname, file, filename, function() {
//         ++outfiles;
//         if (done)
//           console.log(outfiles + '/' + infiles + ' parts written to disk');
//         if (done && infiles === outfiles) {
//           // ACTUAL EXIT CONDITION
//           console.log('All parts written to disk');
//           res.writeHead(200, { 'Connection': 'close' });
//           res.end("That's all folks!");
//         }
//       });
//     });
//     busboy.on('end', function() {
//       console.log('Done parsing form!');
//       done = true;
//     });
//     req.pipe(busboy);
