/*
Copyright 2013 Simon Lydell

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not,
see <http://www.gnu.org/licenses/>.
*/

var cssParse = require("css-parse")
var sheet    = require("sheet")
var Climap   = require("../")

function error(err) {
	process.stderr.write("css-minify-concat error:\n" + err + "\n")
	process.exit(1)
}

var args = process.argv.slice(2)
var opts = {
	map: false
}

switch (args[0]) {
	case undefined:
	case "-h":
	case "--help":
		console.log("Usage: css-minify-concat [options] [inputFiles...] outputFile")
		console.log("")
		console.log("  Options:")
		console.log("")
		console.log("     -m, --map     create <outputFile>.map source map file")
		console.log("     -h, --help    show this help message")
		console.log("")
		console.log("  Reads from stdin if there are no inputFiles.")
		console.log("  Writes to stdout if outputFile is a single dash (-).")
		process.exit(0)
		break

	case "-m":
	case "--map":
		opts.map = true
		args.shift()
		break

	default:
		if (/^(?:-\w|--\w+)/.test(args[0])) {
			error("Unrecognized option: " + args[0] + ". Use --help for help.")
		}
}

opts.outputFile = args.pop()

if (args.length === 0) {
	var css = ""
	process.stdin.resume()
	process.stdin.on("data", function(chunk) { css += chunk })
	process.stdin.on("end", function() {
		compile({source: "stdin", content: css}, opts)
	})
} else {
	compile(args, opts)
}

function compile(inputFiles, opts) {
	try {

		Climap(inputFiles, opts.outputFile)
			.parse(function(content, source) {
				return cssParse(content, {position: true, source: source})
			})
			.reduce(function(concat, current) {
				Array.prototype.push.apply(concat.stylesheet.rules, current.stylesheet.rules)
				return concat
			})
			.compile(function(ast, data) {
				data.compress = true
				data.map = (opts.map && opts.outputFile !== "-")
				var compiled = sheet(ast, data)
				return {content: compiled.css, map: compiled.map}
			})
			.write(function(compiled, map) {
				if (opts.outputFile === "-") {
					process.stdout.write(compiled)
					return true
				}
			})

	} catch(err) {
		error(err)
	}
}
