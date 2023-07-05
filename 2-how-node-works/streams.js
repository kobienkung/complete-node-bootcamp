const fs = require("fs");
const server = require("http").createServer();

server.on("request", (req, res) => {
  // Solution 1
  //   fs.readFile("test-file.txt", "utf8", (err, data) => {
  //     if (err) console.log(err);
  //     res.end(data);
  //   });

  // Solution 2: Stream
  //   const readable = fs.createReadStream("test-file.txt");
  //   readable.on("data", (chunk) => {
  //     res.write(chunk);
  //   });
  //   readable.on("end", () => {
  //     res.end();
  //   });
  //   readable.on("error", (err) => {
  //     console.log(err);
  //     res.statusCode = 500;
  //     res.end("file not found");
  //   });

  // Solution 3: better than stream because readable can't respond fast enough to a lot of chunk of data
  const readable = fs.createReadStream("test-file.txt");
  readable.pipe(res); // readable_Source.pipe(writable_Destination)
});

server.listen(8000, "127.0.0.1", () => {
  console.log("Listening...");
});
