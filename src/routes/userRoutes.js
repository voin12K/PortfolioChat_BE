const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. Настройка Cloudinary
cloudinary.config({
  cloud_name: "dxx51nrfo",
  api_key: "667453156811916",
  api_secret: "ce6IBYS3_OV_D2HTLiNJG0Yn-Qg",
});

// 2. Настройка Multer + Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
    params: {
    folder: 'user_avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    public_id: (req, file) => {
        const id = `avatar_${req.user.id}_${Date.now()}`;
        req.publicImageId = `user_avatars/${id}`; // <-- сохраняем public_id
        return id;
    },
    }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

// 3. Обновление профиля с загрузкой в Cloudinary
router.put('/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { name, username } = req.body;
    const updates = {};

    if (name) updates.name = name;

    // Проверка уникальности username, если он передан
    if (username) {
      const existingUser = await User.findOne({ username });

      // Если найден другой пользователь с таким же username (и это не текущий пользователь)
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        // Удалим загруженный аватар, если он есть, чтобы не остался "мусор"
        if (req.file && req.publicImageId) {
          await cloudinary.uploader.destroy(req.publicImageId);
        }

        return res.status(400).json({ error: 'Username is already taken' });
      }

      updates.username = username;
    }

    // Сохраняем URL аватара, если загружен
    if (req.file) {
      updates.profileImage = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);

    if (req.file && req.publicImageId) {
      await cloudinary.uploader.destroy(req.publicImageId);
    }

    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


// 4. Поиск пользователей (без изменений)
router.get('/users', async (req, res) => {
  const { username } = req.query;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  try {
    const users = await User.find({
      username: { $regex: username, $options: 'i' }
    })
    .limit(10)
    .select('username name email profileImage description');

    res.json(users.length > 0 ? users : { error: 'No users found' });
    
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;