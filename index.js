const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT ?? 8080; // Change to your desired port

app.use(express.json());

// Endpoint to receive data and insert into the specified table
app.post('/insert', async (req, res) => {
  try {
    const { table, user, password, columns, values } = req.body;
    console.debug(`Incoming body: ${req.body}`);
  
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
    console.debug(`Data inserted succesffuly: ${req.body}`);
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get() {
  console.log("Que haces acá?");
}