const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT ?? 8080; // Change to your desired port
const path = require('path');
const fs = require('fs');

const WETWEIGHT_QUERY = `
      SELECT wetweight 
      FROM spa.wetweights 
      ORDER BY id DESC 
      LIMIT 1
    `;

class UnauthorizedException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.code = 401;
  }
}

function errorHandler (error, res) {
  if(error instanceof UnauthorizedException) {
    error.message += " at authentication";
    console.error(error.message);
    res.status(error.code).json({error: error.message})
  } else {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

function authenticate(basic_token) {
  if(basic_token != process.env.BASIC_AUTH) {
    throw new UnauthorizedException("Unauthorized exception");
  }
  console.log("Login succesfully!");   
}

const columnName = {
  pl: "pluviometer",
  ws: "windspeed",
  wd: "winddirection",
  l: "leafmoisture",
  h: "humidity",
  r: "radiation",
  t: "temperature",
  pr: "pressure",
  wh: "weight",
  etc: "etc",
  wwh: "wetweight",
  hc: "httpcode",
  msg: "message",
  lv: "level",
  src: "source"
}

app.use(express.json());
app.use(express.static("public"));

// Context to receive data and insert into the specified table
app.post('/insert', async (req, res) => {
  try {
    authenticate(req.headers.authorization);
    console.debug(`Incoming body: ${JSON.stringify(req.body)}`);
    const { tb, fr } = req.body;
    const frame = fr.substring(tb.indexOf(">") + 1, fr.indexOf("<"));
    var [command, finalFrame] = frame.split("+");
    const sensors = finalFrame.split(";");
    const columns = [];
    const values = [];

    sensors.forEach((sensor) => {
      const [name, value] = sensor.split(":");
      console.log(name + " -> " + value);
      columns.push(columnName[name]);
      values.push(value);
    }); 

    console.log("Comando: " + command);
    console.log("Tabla: " + tb);
    console.log("Columnas: " + columns); 
    console.log("Valores: " + values); 
  
    const database = process.env.PG_DB
    console.debug(`Trying to insert to: ${database}`);

    const pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DB,
      password: process.env.PG_PASS,
      port: process.env.PG_PORT,
      ssl: require
    });

    const query = `INSERT INTO ${tb} (${columns.join(', ')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})`;
    console.log("Query: " + query);
    console.log("Values: " + values);
    await pool.query(query, values);

    res.status(201).json({ message: 'Data inserted successfully' });
    console.debug(`Data inserted succesffuly: "${values}" in "${columns}" from "${tb}"`);
  } catch (error) {
    console.error(error);
    error.message = "Error on inserting data";
    errorHandler(error, res);
  }
});

app.post('/log', async (req, res) => {
  try {
    authenticate(req.headers.authorization);
    console.debug(`Incoming log: ${JSON.stringify(req.body)}`);
    const { fr } = req.body;
    const frame = fr.substring(fr.indexOf(">") + 1, fr.lastIndexOf("<")+1);
    console.log("Incoming frame: " + frame);
    const fields = ['hc', 'msg', 'lv', 'src'];
    const columns = [];
    const values = [];

    fields.forEach((column, index) => {
      if(index === fields.length - 1) {
        const value = frame.substring(frame.indexOf(column) + column.length + 1, frame.lastIndexOf("<"));
        values.push(value);
      } else {
        const value = frame.substring(frame.indexOf(column) + column.length + 1, frame.indexOf(fields[index+1]) - 1);
        values.push(value);
      }
      columns.push(columnName[column]);
    })

    console.debug(`Trying to insert to: ${process.env.PG_DB}`);

    const pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DB,
      password: process.env.PG_PASS,
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
    console.error(error);
    error.message = 'Error inserting log'; 
    errorHandler(error, res);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get('/etc', async (req, res) => {
  try {
    authenticate(req.headers.authorization);
    const pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DB,
      password: process.env.PG_PASS,
      port: process.env.PG_PORT,
      ssl: require
    });

    const wetweight_result = await pool.query(WETWEIGHT_QUERY);

    const finalResponse = {
      wetweight: wetweight_result.rows[0].wetweight
    };

  console.debug("Returning wetweight value: " + JSON.stringify(finalResponse)); 

  res.json(finalResponse);

  } catch (error) {
    error.message = 'Error on query execution'; 
    errorHandler(error, res);
  }
});

app.get('/',(req, res) => {
  authenticate(req.headers.authorization);
  const indexPath = path.join(__dirname, '../public', 'index.html');
  console.log(indexPath);
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading HTML file:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.send(data).status(200);
  });
});

app.get('/ping', async (req, res) => {
  try {
    authenticate(req.headers.authorization);
    const pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DB,
      password: process.env.PG_PASS,
      port: process.env.PG_PORT,
      ssl: require
    });

    console.debug("Incoming ping alarm.");

    res.status(200).json({ message: 'Ping alarm received' });

  } catch (error) {
    error.message = 'Error on query execution'; 
    errorHandler(error, res);
  }
});
