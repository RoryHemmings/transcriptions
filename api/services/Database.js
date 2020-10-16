// to access .env file
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const sql3 = require('sqlite3').verbose();
const db = new sql3.Database(process.env.DATABASE_PATH, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to Database');
});

const database = {
  insertUser: async (user) => {
    return new Promise((resolve, reject) => {
      db.run(`INSERT INTO users(id, username, passwordHash) VALUES(?, ?, ?)`, [user.id, user.username, user.passwordHash], (err, res) => {
        resolve(err);
      });
    });
  },
  findUserByUsername: async (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, res) => {
        if (err) {
          console.error(err);
          reject(error);
        }

        resolve(res);
      });
    });
  },
  findUserById: async (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, res) => {
        if (err) {
          console.error(err);
          reject(error);
        }

        resolve(res);
      });
    });
  },
  close: () => {
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Close the database connection.');
    });
  }
}

module.exports = database;

// db.get('SELECT * FROM users WHERE username = ?', ['rory'], (err, res) => {
//   if (err) {
//     console.log(err);
//   }
//   console.log(res);
// })

/*
  Basic queries
  CREATE TABLE people (id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, age INTEGER, gender TEXT);
  INSERT INTO people (first_name, last_name, age, gender) VALUES ("rick", "sanchez", 35, "m");
  SELECT * FROM people WHERE last_name="bob" ORDER BY age DESC;
  DELETE FROM people WHERE age=5;

  db.all returns all occurances
  db.get returns single occurance
  db.each calls callback for each row

  db.run can be used to insert data or any other command (calls callback)
*/