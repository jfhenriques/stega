

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
