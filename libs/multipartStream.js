

var multiparty = require('multiparty'),
	BufferList = require('bl'),
	maxGlobalSize = 3 * 1024 * 1024;

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


module.exports = function(req, res, next)
{
	//var ts = (new Date()).getTime();

	req.multipartError = false;
	req.body = {};
	req.files = {};


	var received = 0,
		len = req.headers['content-length']
				? parseInt(req.headers['content-length'], 10)
				: null;


	// limit by content-length
	if (len && len > maxGlobalSize)
	{
		req.multipartError = "Entety too large";

		return next();
	}
	else
	{

		req.on('newListener', function handler(event) {

			//if (event !== 'data') return;

			req.removeListener('newListener', handler);
			// Start listening at the end of the current loop
			// otherwise the request will be consumed too early.
			// Sideaffect is `limit` will miss the first chunk,
			// but that's not a big deal.
			// Unfortunately, the tests don't have large enough
			// request bodies to test this.
			process.nextTick(function() {

				req.on('data', function(chunk) {
					received += Buffer.isBuffer(chunk)
									? chunk.length
									: Buffer.byteLength(chunk);

					if (received > maxGlobalSize) req.destroy();
				});
			});
		});





		var form = new multiparty.Form(),
			fields = {},
			files = {};

		form.on('error', function(err) {

			req.multipartError = err || true;

			next();
		});

		// form.on('progress', function(bytesReceived, bytesExpected) {
			
		// 	console.log("R: " + bytesReceived + ", E: " + bytesExpected);

		// 	if( bytesExpected > maxFileSize || bytesReceived > maxFileSize )
		// 	{
		// 		req.multipartError = "Entety too large";

		// 		res.write(req.multipartError);
		// 		res.end();

		// 		req.destroy();
		// 	}	
		// });

		form.on('field', function(name, value) {

			if( name )
				onData(name, value, fields);

		});

		form.on('part', function(part) {

			if( !part.filename )
				return;

			var obj = {
					filename: part.filename,
					size: part.byteCount,
					name: part.name,
					type: part.headers && part.headers['content-type'],
					buffer: new BufferList()

				};

			part.pipe(obj.buffer);

			if(part.name)
				onData(part.name, obj, files);
		});


		form.on('close', function() {

			req.body = fields;
			req.files = files;
			
			//console.log("Took: " + (((new Date()).getTime())-ts));

			next();
			
		});

		
		try {
			form.parse(req);

		} catch(error) {
			req.multipartError = error;
			console.log("error: " + error);

			return next();
		}
	}

}
