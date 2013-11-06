



	var Busboy = require('busboy');
	var inspect = require('util').inspect;

	var busboy = new Busboy({ headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7l6BILZ8JJISzi2A' } });

	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

	  console.log('File [' + fieldname +']: filename: ' + filename + ', encoding: ' + encoding);
	  file.on('data', function(data) {
	    console.log('File [' + fieldname +'] got ' + data.length + ' bytes');
	  });
	  file.on('end', function() {
	    console.log('File [' + fieldname +'] Finished');
	  });
	});

	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
	  console.log('Field [' + fieldname + ']: value: ' + inspect(val));
	});
	busboy.on('end', function() {
	  console.log('Done parsing form!');
	});
	require('fs').createReadStream('output.req').pipe(busboy);