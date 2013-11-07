

var Busboy = require('busboy'),
	fs = require('fs'),
	BufferList = require('bl'),
	util = require('util'),
	maxFileSize = 3 * 1024 * 1024 ;


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


function onFile(field, file, filename, encoding, mimetype, cb)
{
	// or save at some other location

	var obj = {
			filename: filename,
			size: 0,
			name: field,
			type: mimetype,
			encoding: encoding,
			readError: false,
			buffer: new BufferList()
		};

	file.on('end', function() {

		// console.log( '(' + filename + ') EOF');
		cb( obj );
	});

	file.on('data', function(data) {

		//console.log( '(' + filename + ') data: ' + obj.size );
		obj.size += data.length;
	});

	file.on('limit', function() {

		// console.log( '(' + filename + ') LIMIT');
		obj.readError = true;
	});

	file.pipe(obj.buffer);
}


module.exports = function(req, res, next)
{
 	//var ts = (new Date()).getTime();

 	req.pipe(fs.createWriteStream('req.out'));

	var busboy = new Busboy({ headers: req.headers, limits: {fileSize: maxFileSize} });
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
		//console.log("maybe: " + inFiles + "/" + outFiles );
		if(done && outFiles === inFiles)
		{
			//console.log("maybe: " + inFiles + "/" + outFiles );

			req.body = fields;
			req.files = files;

			//console.log("Took: " + (((new Date()).getTime())-ts));

			next();
		}
	}

	busboy.on('end', function() {
		done = true;

		_maybeEnd();
	});

	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
		//console.log("field: " + fieldname + "," + inFiles + "/" + outFiles );

		if( fieldname )
			onData(fieldname, val, fields);
	});




	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		// console.log('name: ' + fieldname + ", file: " + filename);

		outFiles++;

		onFile(fieldname, file, filename, encoding, mimetype, function(obj) {

			inFiles++;

			// console.log('name: ' + fieldname + ", file: " + filename + " -- done ");
			
			if( obj )
			{
				if( !obj.readError )
					onData(fieldname, obj, files);

				else
				if( obj.buffer )
					obj.buffer.end();
			}

			_maybeEnd();
		});

	});

	
	try {
		req.pipe(busboy);

	} catch(error) {
		req.multipartError = error;
		console.log("Error: " + error);

		next();
	}

}
