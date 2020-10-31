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
      db.run(`INSERT INTO users(id, username, bio, passwordHash) VALUES(?, ?, ?, ?)`, [user.id, user.username, user.bio, user.passwordHash], (err, res) => {
        if (err) {
          reject(err);
        }

        resolve(res);
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
  updateSettings: async (user) => {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE users SET bio = ?, passwordHash = ? WHERE id = ?`, [user.bio, user.passwordHash, user.id], (err) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      })
    });
  },
  insertTranscription: (transcription) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO transcriptions (id, title, encoding, mimetype, size, path, cbUsername, tags) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
        [transcription.id, transcription.title,
          transcription.encoding, transcription.mimetype,
          transcription.size, transcription.path,
          transcription.cbUsername,
          JSON.stringify(transcription.tags)
        ],
        (err, res) => {
          if (err) {
            reject(err);
          }

          resolve(res);
        });
    });
  },
  findTranscriptionById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM transcriptions WHERE id = ?', [id], (err, res) => {
        if (err) {
          reject(err);
        }

        resolve(res);
      });
    });
  },
  findTranscriptionsByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM transcriptions WHERE cbUsername = ?', [username], (err, res) => {
        if (err) {
          reject(err);
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
      console.log('Closed the database connection.');
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
  DROP TABLE table_name; to Delete table

  db.all returns all occurances
  db.get returns single occurance
  db.each calls callback for each row

  db.run can be used to insert data or any other command (calls callback)

  tags are stringified arrays since sqlite cant store arrays
  CREATE TABLE transcriptions (id BLOB PRIMARY KEY, title TEXT, encoding TEXT, mimetype TEXT, size INTEGER, path TEXT, cbUsername TEXT, tags TEXT);

  751f4448-d7bd-4fc9-a2eb-15eef9bfb84d
*/