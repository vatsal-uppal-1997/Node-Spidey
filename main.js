const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const https = require("https");
const http = require("http");
const cheerio = require("cheerio");
const tree = {};
const visited = {};

function asyncReq(url) {
	return new Promise((resolve, reject) => {
		url = new URL(url);
		switch (url.protocol) {
			case "https:":
				https.get(url, (response) => {
					var data = "";
					response.on("data", (body) => { data += body; });
					response.on("end", () => {
						resolve(data);	
					});
				}).on("error", (error) => {
					reject(error);
				});
				break;

			case "http:":
				http.get(url, (response) => {
					var data = "";
					response.on("data", (body) => { data += body; });
					response.on("end", () => {
						resolve(data);	
					});
				}).on("error", (error) => {
					reject(error);
				});
				break;
		}

	});
}


function getAll(url, tree, depth, bounded) {
	if (depth <= 0)
		return Promise.resolve("Desired depth achieved");
	let currentUrl;
	try {
		currentUrl = new URL(url);
		url = currentUrl.toString();
	} catch (err) {
		if (!(err instanceof TypeError))
			return promise.reject("Error occured while parsing the url :" + url + " error : "+err);
		return promise.reject("Invalid url");
	}
	return new Promise((res, rej) => {
		depth--;
		tree[url] = {};
		visited[url] = true;
		console.log("Visiting : "+url);
		asyncReq(url)
			.then(async (body) => {
				const waitForRes = [];
				const $ = cheerio.load(body);
				const links = $("a");
				let hrefStr = undefined;
				let hrefObj = undefined;
				$(links).each((index, element) => {
					try {
						hrefStr = $(element).attr("href");
						hrefObj = new URL(hrefStr, currentUrl);
						hrefStr = hrefObj.toString();
					} catch (err) {
						if (!(err instanceof TypeError))
							console.log("An error occure while parsing the url : "+hrefStr);
						return;	
					}
					if (!visited[hrefStr] && (bounded?hrefObj.hostname === currentUrl.hostname && hrefObj.href.indexOf(currentUrl.pathname) > -1:true)) {
						let crawl = getAll(hrefStr, tree[url], depth, bounded)
								.catch((err) => {
									console.log("A promise failed with error : "+err);
								});
						waitForRes.push(crawl);
					}
				});
				await Promise.all(waitForRes);
				res(url);
			})
			.catch((error) => rej(error));
	});
}



function main() {
 
	let url = args["_"][0];
	let depth = parseInt(args["d"] || args["depth"], 10);
	let bounded = args["bounded"] ? true: false; 
	if (isNaN(depth)) {
		console.log("please provide a valid depth");
		return;
	}
	if (!url.endsWith("/"))
		url += "/";
	getAll(url, tree, depth, bounded).then(()=>{
		fs.writeFile("report.json", JSON.stringify(tree), (err) => {
			if (err) throw err;
		});
	});

}


main();
