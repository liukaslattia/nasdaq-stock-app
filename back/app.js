const express = require('express')
const app = express()
var cors = require('cors');
app.use(express.json())
app.use(cors())
var path = require("path");

const https = require('https')

let stockname = ''

// Receive stock name and the range of data fetch.
app.post('/api/stock', function (request, res1) {
  var stock = request.body.stock;
  var startDate = request.body.start;
  var endDate = request.body.end;

  stockname = stock

  // Set http request parameters.
const options = {
  host: 'www.nasdaq.com',
  path: `/api/v1/historical/${stockname}/stocks/${startDate}/${endDate}`,
  headers: {
    'Accept-Encoding': 'deflate',
    'Connection': 'keep-alive',
    'User-Agent': `https://www.nasdaq.com/api/v1/historical/${stockname}/stocks/${startDate}/${endDate}`
  }
};

// Make a http request and receive response.
const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`)

  res.on('data', d => {
    data += d

  })
  res.on("end", () => {

     res1.send(data)
  })
})

req.on('error', error => {
  console.error(error)
})


data = ''
req.end()
})




let data

// Send data to frontend.
app.get('/api/stockData', (req, res) => {

  res.send(data)

  
})


app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
const server = app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${server.address().port}`)
})