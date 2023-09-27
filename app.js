const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.static('public'))

app.get('*', (req, res) => {
    res.redirect('/');
})

app.post('/insert', async (req, res) => {
  try {
    const { table, user, password, columns, values } = req.body;
    const database = process.env.PG_DB

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
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
})