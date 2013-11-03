
module.exports = {
	json: json,
	redirect: redirect,
	html: {

	}
};


/***********************************************************************************************/

function json(req, res, out, statusCode) {

	var size;

	out = JSON.stringify( out );
	size = Buffer.byteLength( out, 'UTF-8' );

	res.writeHead( statusCode,
				   { 'Content-Type': 'application/json; charset=utf-8',
					 'Content-Length': size} );

	res.write( out );
	res.end();
}


function redirect(res, path)
{
	res.writeHead(302, {'Content-Type': 'text/html; charset=utf-8',
						'Location': path,
						'Content-Length': 0});
	res.end();
}
