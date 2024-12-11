const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve static files

// Connect to MongoDB
//mongodb+srv://manishankar:mani1430fire@sourcing.z6c6p.mongodb.net/?retryWrites=true&w=majority&appName=sourcing
mongoose.connect('mongodb://localhost:27017/library-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Model
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', UserSchema);

// Book Model
const BookSchema = new mongoose.Schema({
  title: String,
  author: String,
  isbn: String,
  publicationDate: Date,
  genre: String,
  copiesAvailable: Number,
  coverImage: String,
});

const Book = mongoose.model('Book', BookSchema);

// Borrow Record Model
const BorrowRecordSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  borrowDate: { type: Date, default: Date.now },
  returnDate: Date,
});

const BorrowRecord = mongoose.model('BorrowRecord', BorrowRecordSchema);

// Authentication Routes
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const user = new User({ username, email, password });
    await user.save();
    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ message: 'Login successful', userId: user._id, username: user.username });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Middleware to check if user is authenticated
const auth = async (req, res, next) => {
  const userId = req.headers['userid'];
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.userId = userId;
    req.username = user.username;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Route to get user info
app.get('/user', auth, (req, res) => {
  res.json({ username: req.username });
});

// Book Routes
app.post('/books', auth, async (req, res) => {
  const { title, author, isbn, publicationDate, genre, copiesAvailable, coverImage } = req.body;
  try {
    const book = new Book({ title, author, isbn, publicationDate, genre, copiesAvailable, coverImage });
    await book.save();
    res.json({ message: 'Book added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add book' });
  }
});

app.get('/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve books' });
  }
});

app.get('/books/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve book' });
  }
});

// server.js

app.put('/books/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, publicationDate, genre, copiesAvailable, coverImage } = req.body;
  try {
    const book = await Book.findByIdAndUpdate(
      id,
      { title, author, isbn, publicationDate, genre, copiesAvailable, coverImage },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book updated successfully', book });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update book' });
  }
});

app.delete('/books/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete book' });
  }
});

// Borrowing Routes
app.post('/borrow', auth, async (req, res) => {
  const { bookId } = req.body;
  try {
    const book = await Book.findById(bookId);
    if (book.copiesAvailable < 1) {
      return res.status(400).json({ message: 'No copies available' });
    }
    book.copiesAvailable -= 1;
    await book.save();

    const borrowRecord = new BorrowRecord({ userId: req.userId, bookId });
    await borrowRecord.save();

    res.json({ message: 'Book borrowed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to borrow book' });
  }
});

app.post('/return', auth, async (req, res) => {
  const { borrowRecordId } = req.body;
  try {
    const borrowRecord = await BorrowRecord.findById(borrowRecordId);
    if (!borrowRecord) {
      return res.status(404).json({ message: 'Borrow record not found' });
    }
    borrowRecord.returnDate = new Date();
    await borrowRecord.save();

    const book = await Book.findById(borrowRecord.bookId);
    book.copiesAvailable += 1;
    await book.save();

    res.json({ message: 'Book returned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to return book' });
  }
});

app.get('/my-borrows', auth, async (req, res) => {
  try {
    const borrows = await BorrowRecord.find({ userId: req.userId, returnDate: null }).populate('bookId');
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve borrowed books' });
  }
});

// Insert sample data into Book collection if not already present
const sampleBooks = [
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    publicationDate: new Date('1925-04-10'),
    genre: 'Fiction',
    copiesAvailable: 5,
    coverImage: 'images/great-gatsby.jpg'
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780061120084',
    publicationDate: new Date('1960-07-11'),
    genre: 'Fiction',
    copiesAvailable: 3,
    coverImage: 'images/to-kill-a-mockingbird.jpg'
  },
  {
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    publicationDate: new Date('1949-06-08'),
    genre: 'Dystopian',
    copiesAvailable: 4,
    coverImage: 'images/1984.jpg'
  }
];

(async () => {
  try {
    const books = await Book.find();
    if (books.length === 0) {
      await Book.insertMany(sampleBooks);
      console.log('Sample books added');
    }
  } catch (err) {
    console.error('Failed to add sample books', err);
  }
})();

app.listen(5000, () => {
  console.log('Server started on port 5000');
});