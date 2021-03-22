import React, { Component } from 'react';
import { jsonToCSV, readString } from 'react-papaparse'
import { readRemoteFile } from 'react-papaparse'




class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      stockData: [''],
      stock: '',
      start: '',
      end: '',
      showBullish: false

    }

    this.whenFormChanges = this.whenFormChanges.bind(this)
    this.simpleMovingAverage = this.simpleMovingAverage.bind(this)

  }

  // Calculate simple moving average.
  simpleMovingAverage(prices, window = 5, n = Infinity) {
    if (!prices || prices.length < window) {
      return []
    }

    let index = window - 1
    const length = prices.length + 1

    const simpleMovingAverages = []

    let numberOfSMAsCalculated = 0

    while (++index < length && numberOfSMAsCalculated++ < n) {
      const windowSlice = prices.slice(index - window, index)
      const sum = windowSlice.reduce((prev, curr) => prev + curr, 0)
      simpleMovingAverages.push(sum / window)
    }

    return simpleMovingAverages
  }



  // Fetch stock data from backend and parse it to usable form.
  fetchData() {

    // Check input fields
    if (this.state.stock === '' ||
      this.state.start === '' ||
      this.state.end === '') {
      alert("Fill all fields.")
    } else {

      // Fetch configuration.
      let configuration = {
        method: 'post',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(this.state)
      }
      
      // Send stock name and the range of data fetch.
      fetch('/api/stock', configuration).then(() => {

        // Parse received data using react-papaparse.
        readRemoteFile('/api/stockData', {
          download: true,
          complete: (results) => {
            let csvData = jsonToCSV(results)
            let convertedData = readString(csvData, {
              header: true
            })


            this.setState({ stockData: convertedData.data })

            // Map headers for easier parsing.
            let parsedDataArray = this.state.stockData.map(item => {
              return {
                Date: item.Date,
                CloseLast: item[" Close/Last"],
                Volume: item[" Volume"],
                Open: item[" Open"],
                High: item[" High"],
                Low: item[" Low"],
              }
            })
            // Remove blank data field.
            parsedDataArray.splice(-1, 1)




            // Remove $ signs for easier parsing and add properties.
            parsedDataArray.forEach(function (item) {

              let high = item.High.replace(/[$]/, "")
              let closelast = item.CloseLast.replace(/[$]/, "")
              let low = item.Low.replace(/[$]/, "")
              let open = item.Open.replace(/[$]/, "")

              item.High = parseFloat(high).toFixed(2)
              item.Low = parseFloat(low).toFixed(2)
              item.CloseLast = parseFloat(closelast).toFixed(2)
              item.Open = parseFloat(open).toFixed(2)

              // Calculate stock price change within a day.
              let change = item.High - item.Low
              item.Change = parseFloat(change).toFixed(2)
              // Add properties.
              item.Average = 0
              item.Sma = 0

            })

            // Array for calculating SMA
            let closedLastArray = []

            for (let i = parsedDataArray.length - 1; i >= 0; i--) {

              closedLastArray.push(parseFloat(parsedDataArray[i].CloseLast))
            }


            // Calculate Average and SMA and add them to the array.
            let average = this.simpleMovingAverage(closedLastArray).reverse()

            for (let i = 0; i < parsedDataArray.length; i++) {

              let simpleMovingAverage = parseFloat((parsedDataArray[i].Open) - parseFloat(average[i])) / parseFloat(average[i]) * 100.0
              parsedDataArray[i].Sma = parseFloat(simpleMovingAverage).toFixed(2)
              parsedDataArray[i].Average = parseFloat(average[i]).toFixed(2)


            }


            this.setState({ stockData: parsedDataArray })

          }

        })
      })
      // Show bullish result on completion.
      this.setState({ showBullish: true })

    }

  }


  // Render full stock data sorted by date.
  RenderTable() {

    return this.state.stockData.map(({ Date, CloseLast, Volume, Open, High, Low }) => {
      return <tr key={Date}>
        <td >{Date} </td>
        <td > {CloseLast}</td>
        <td >{Volume}  </td>
        <td > {Open} </td>
        <td >{High} </td>
        <td > {Low}</td>
      </tr>
    })
  }

  // Calculate and render result of bullish trend.
  RenderBullish() {

    // Counter for calculating longest bullish and its start and end dates.
    let counter = {
      current: 0,
      longest: 0,
      startDate: '',
      endDate: ''
    }

    // Calculate longest bullish and its start and end dates.
    for (let i = 1; i < this.state.stockData.length - 1; i++) {
      if (this.state.stockData[i].CloseLast < this.state.stockData[i - 1].CloseLast) {
        counter.current += 1
        if (counter.longest < counter.current) {
          counter.longest += 1

          counter.startDate = this.state.stockData[i - 1].Date
          if (this.state.stockData[i].CloseLast < this.state.stockData[i - 1].CloseLast) {
            counter.endDate = this.state.stockData[i - counter.longest].Date
          }
        }
      } else {

        counter.current = 0
      }
    }

    return <p>In {this.state.stock} stock historical
     data the Close/Last price increased {counter.longest} days in
     a row between {counter.startDate} and {counter.endDate}.</p>


  }



  // Sort and render stock data based on SMA.
  RenderSimpleMovingAverage() {

    this.state.stockData.sort(function (a, b) {
      return b.Sma - a.Sma
    })


    return this.state.stockData.map(({ Date, Open, Average, Sma }) => {
      return <tr key={Date}>
        <td >{Date} </td>
        <td >{Open} </td>
        <td > {Average} </td>
        <td > {Sma} </td>

      </tr>
    })

  }





  // Sort and render stock data based on trading volume and price change.
  RenderTrading() {

    this.state.stockData.sort(function (a, b) {
      return b.Volume - a.Volume || b.Change - a.Change
    })

    return this.state.stockData.map(({ Date, Volume, Change, Low, High }) => {
      return <tr key={Date}>
        <td >{Date} </td>
        <td >{Volume}  </td>
        <td > {Change} </td>

        <td > {Low}</td>
        <td >{High} </td>
      </tr>
    })
  }


  // For handling input.
  whenFormChanges(event) {
    this.setState({ [event.target.name]: event.target.value })
  }




  render() {

    return (<div>
      <a href="https://github.com/liukaslattia/nasdaq-stock-app">GitHub</a>

      <h1>Current Stock: {this.state.stock}</h1>

      <div className="searchBar">
        <h2>Enter the stock marker e.g. (AAPL, AMZN) and search range for historical data.</h2>
        <label htmlFor="name">Stock:</label>
        <input type="text" onChange={this.whenFormChanges} name="stock" className="form-control" id="name" placeholder="Enter stock ticker" required="required" />
        <br></br>
        <label htmlFor="start">Start Date:</label>
        <input type="date" onChange={this.whenFormChanges} name="start" className="form-control" id="start" placeholder="search stock" required="required" />
        <br></br>
        <label htmlFor="name">End Date:</label>
        <input type="date" onChange={this.whenFormChanges} name="end" className="form-control" id="end" placeholder="search stock" required="required" />
        <br></br>
        <button type="button" onClick={() => this.fetchData()} className="button" required>Search</button>
      </div>



      <h1>Bullish trend</h1>
      <h2>The max amount of days the stock price was increasing in a row.</h2>
      <h2>Sorted by date.</h2>
      { this.state.showBullish ? this.RenderBullish() : false}
      <table className="table">
        <tbody>
          <tr >
            <th>Date</th>
            <th>Close/Last</th>
            <th>Volume</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
          </tr>
          {this.RenderTable()}
        </tbody>
      </table>
      <h1>Simple moving average</h1>
      <h2>Dates that had the best opening price compared to 5 days simple moving average (sma).</h2>
      <h2>Sorted by price change percentages.</h2>
      <table className="table">
        <tbody>
          <tr >
            <th>Date</th>
            <th>Open</th>
            <th>Average</th>
            <th>Sma %</th>
          </tr>
          {this.RenderSimpleMovingAverage()}


        </tbody>
      </table>
      <h1>Trading volume and price change</h1>
      <h2>Dates that had the highest trading volume and the most signicant stock price change within a day.</h2>
      <h2>Sorted by volume and price change.</h2>
      <table className="table">
        <tbody>
          <tr >
            <th>Date</th>

            <th>Volume</th>
            <th>Change</th>

            <th>Low</th>
            <th>High</th>
          </tr>
          {this.RenderTrading()}
        </tbody>
      </table>

    </div>

    )
  }
}


export default App;
