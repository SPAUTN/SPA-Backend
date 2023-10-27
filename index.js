const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT ?? 8080; // Change to your desired port
const path = require('path');
const fs = require('fs');

const WetWeight_QUERY = `
  SELECT wetweight 
  FROM spa.wetweights 
  ORDER BY id DESC 
  LIMIT 1
`;

const RAIN_QUERY = `
  SELECT DATE(timestamp) as fecha,
  SUM(pluviometer) as precipitacion_acumulada
  FROM spa.weatherstation
  WHERE DATE(timestamp) = (SELECT MAX(DATE(timestamp)) FROM spa.weatherstation)
  GROUP BY DATE(timestamp)
  LIMIT 1
`;

app.use(express.json());
app.use(express.static("public"));

// Endpoint to receive data and insert into the specified table
app.post('/insert', async (req, res) => {
  try {
    console.debug(`Incoming body: ${JSON.stringify(req.body)}`);
    const { table, user, password, frame } = req.body;
    const columns = Object.keys(frame);
    const values = Object.values(frame);
  
    const database = process.env.PG_DB
    console.debug(`Trying to insert to: ${database}`);

    // Create a new pool with the provided username, password, and database name
    const pool = new Pool({
      user: user,
      host: process.env.PG_HOST,
      database: database,
      password: password,
      port: process.env.PG_PORT,
      ssl: require
    });

    // Construct the SQL query dynamically based on the columns and values
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})`;
    
    // Execute the query with the values
    await pool.query(query, values);

    res.status(201).json({ message: 'Data inserted successfully' });
    console.debug(`Data inserted succesffuly: "${Object.values(frame)}" in "${Object.keys(frame)}" from "${table}"`);
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/log', async (req, res) => {
  try {
    console.debug(`Incoming log: ${JSON.stringify(req.body)}`);
    const { user, password, frame } = req.body;
    const columns = Object.keys(frame);
    const values = Object.values(frame);
  
    const database = process.env.PG_DB
    console.debug(`Trying to insert to: ${database}`);

    // Create a new pool with the provided username, password, and database name
    const pool = new Pool({
      user: user,
      host: process.env.PG_HOST,
      database: database,
      password: password,
      port: process.env.PG_PORT,
      ssl: require
    });

    // Construct the SQL query dynamically based on the columns and values
    const query = `INSERT INTO spa.logs (${columns.join(', ')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})`;
    
    // Execute the query with the values
    await pool.query(query, values);

    res.status(201).json({ message: 'Log inserted successfully' });
    console.debug("Log inserted succesffuly.");
  } catch (error) {
    console.error('Error inserting log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get('/etcrain', async (req, res) => {
  try {
    const pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DB,
      password: process.env.PG_PASS,
      port: process.env.PG_PORT,
      ssl: require
    });

    const Wetweight_result = await pool.query(WetWeight_QUERY);
    const rain_result = await pool.query(RAIN_QUERY);

    const finalResponse = {
      Wetweight: Wetweight_result.rows[0].wetweight,
      cumulative_rain: rain_result.rows[0].precipitacion_acumulada
    };

  console.debug("Returning wetweight and rain values: " + JSON.stringify(finalResponse)); 

  res.json(finalResponse);

  } catch (error) {
    console.error('Error on query execution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/',(req, res) => {
  const indexPath = path.join(__dirname, '../public', 'index.html');
  console.log(indexPath);

  // Read the HTML file and send it as the response
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading HTML file:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.send(data);
  });
});
