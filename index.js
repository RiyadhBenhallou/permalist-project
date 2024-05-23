import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import _ from "lodash";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let items = [];

const db = new pg.Client({
  connectionString: process.env['DB_URI'],
})
db.connect()

let listId;
const fetchTodos = async () => {
  try {
    const { rows: result } = await db.query('SELECT * FROM items WHERE list_id = $1 ORDER BY created_at DESC', [listId]);
    console.log(result)
    items = result;
  } catch(error) {
    console.log(error.message)
  }
}

app.get("/", async(req, res) => {
  listId = 1;
  await fetchTodos()
  res.render("index.ejs", {
    listTitle: "Today",
    listItems: items,
    listId: listId,
  });
});

app.get("/:listName", async (req, res) => {
  let { listName } = req.params;
  listName = _.capitalize(listName)
  try {
    const {rows: result} = await db.query('SELECT * FROM lists WHERE name = $1', [listName])
    if (result.length === 0) {
      await db.query('INSERT INTO lists (name) VALUES ($1)', [listName])
      res.redirect('/' + listName)
    } else {
      listId = result[0].id
      await fetchTodos()
      res.render("index.ejs", {
        listTitle: result[0].name,
        listItems: items,
        listId: result[0].id
      });
    }
  } catch (error) {
    console.log(error.message)
  }
})

app.post("/add", async (req, res) => {
  const { listId, listTitle, newItem } = req.body;
    await db.query('INSERT INTO items (title, list_id) VALUES ($1, $2)', [newItem, listId])
  if (parseInt(listId) === 1) {
    res.redirect("/");
  } else {
    res.redirect("/" + listTitle);
  }
 
});

app.post("/edit", async (req, res) => {
  const { updatedItemTitle, updatedItemId, listId: currentListId, listTitle } = req.body;
  await db.query('UPDATE items SET title = $1 WHERE id = $2', [updatedItemTitle, updatedItemId])
  if (parseInt(currentListId) === 1) {
    res.redirect('/')
  } else {
    res.redirect('/' + listTitle)
  }
  
});

app.post("/delete", async (req, res) => {
  const { deleteItemId, listId: currentListId, listTitle } = req.body;
  await db.query('DELETE FROM items WHERE id = $1', [deleteItemId])
  if (parseInt(currentListId) === 1) {
    res.redirect('/')
  } else {
    res.redirect('/' + listTitle)
   }
  
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
