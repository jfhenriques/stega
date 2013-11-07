/***************************************************************************************
*
*  Based on:
*	http://onedayitwillmake.com/blog/2013/03/compiling-less-from-a-node-js-script/
*
***************************************************************************************/


var less = require( 'less' );
var fs = require( 'fs' );
var path = require('path');



module.exports = function(lessFile, outFile, cb)
{
	var options = {
		paths         : ["./less"],      // .less file search paths
		outputDir     : "./static",   // output directory, note the '/'
		optimization  : 1,                // optimization level, higher is better but more volatile - 1 is a good value
		filename      : './less/' + lessFile,       // root .less file
		compress      : true,             // compress?
		yuicompress   : true              // use YUI compressor?
	};

	// Load the file, convert to string
	fs.readFile( options.filename, function ( error, data ) {

		if( error )
			throw new Error(error);

		var dataString = data && data.toString();

		// Create a file name such that
		//  if options.filename == gaf.js and options.compress = true
		//    outputfile = gaf.min.css

		// Resolves the relative output.dir to an absolute one and ensure the directory exist
		//options.outputDir = path.resolve( __dirname, options.outputDir) + "/";
		ensureDirectory( options.outputDir );

		options.outputFile = options.outputDir + '/' + outFile ;


		// Create a parser with options, filename is passed even though its loaded
		// to allow less to give us better errors
		var parser = new less.Parser(options);
		parser.parse( dataString, function ( error, cssTree ) {

			if ( error )
			{
				less.writeError( error, options );

				throw new Error("Errors in less");
				return;
			}

			// Create the CSS from the cssTree
			var cssString = cssTree.toCSS( {
				compress   : options.compress,
				yuicompress: options.yuicompress
			} );

			// Write output
			fs.writeFileSync( options.outputFile, cssString, 'utf8' );
			console.log("Converted Less: '" + options.filename + "', to CSS: " + options.outputFile);

			if( cb ) cb();
		});
	});
}

var ensureDirectory = function (filepath) {
	var dir = path.dirname(filepath);
	var existsSync = fs.existsSync || path.existsSync;
	if (!existsSync(dir)) { fs.mkdirSync(dir); }
};