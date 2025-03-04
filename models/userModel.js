// Promisify the pbkdf2 function
const util = require('util');
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const argon2 = require('argon2');

// const pbkdf2Promise = util.promisify(crypto.pbkdf2);
// const pbkdf2Promise = util.promisify(crypto.pbkdf2.bind(crypto));

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    lowercase: true,
    unique: true,
    // Custom validator to check for valid emails
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // Exclude this field from the response we sent back to client
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      /* This will only run for save() and create() method, it will not work for findByIdAndUpdate() method,
       so while updating a user password, we have to use save() method, otherwise the validator will not run
      */
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

/* // Encrytping Password inside pre save hook
userSchema.pre('save', async function (next) {
  try {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hashing password
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash the password with the salt
    const hash = crypto
      .pbkdf2Sync(
        String(this.password),
        salt,
        10000, // Number of iterations
        64, // Key length
        'sha512',
      )
      .toString('hex');

    // Store both the hash and salt
    this.password = `${salt}:${hash}`;

    // Delete the passwordConfirm field from the database
    this.passwordConfirm = undefined;

    next();
  } catch (err) {
    next(err);
  }
});

// Instance Method: A method that is available on every document of a collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // We cannot access the password field using 'this' operator because we have not select it in our schema, that's why we have to pass the userPassword as an argument

  // Extract salt and hash from stored password
  const [salt, storedHash] = userPassword.split(':');

  // Hash the candidate password with the same salt
  const hash = crypto
    .pbkdf2Sync(String(candidatePassword), salt, 10000, 64, 'sha512')
    .toString('hex');

  // Compare the hashes
  return storedHash === hash;
}; */

// Encrytping Password inside pre save hook
/* userSchema.pre('save', async function (next) {
  try {
    // Only run if password is modified
    if (!this.isModified('password')) return next();

    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash the password with the salt asynchronously
    const derivedKey = await pbkdf2Promise(
      String(this.password),
      salt,
      10000, // Number of iterations
      64, // Key length
      'sha512',
    );

    // Convert buffer to hex string and store with salt
    const hash = derivedKey.toString('hex');
    this.password = `${salt}:${hash}`;

    // Remove passwordConfirm field from DB
    this.passwordConfirm = undefined;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Method: A method that is available on every document of a collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  try {
    // Extract salt and hash from stored password
    const [salt, storedHash] = userPassword.split(':');

    // Hash the candidate password with the same salt asynchronously
    const derivedKey = await pbkdf2Promise(
      String(candidatePassword),
      salt,
      10000,
      64,
      'sha512',
    );

    const hash = derivedKey.toString('hex');

    // Compare the hashes
    return storedHash === hash;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}; */

// Encrypting Password in pre save hook
userSchema.pre('save', async function (next) {
  try {
    // Only run if password is modified
    if (!this.isModified('password')) return next();

    // Hash password using Argon2
    this.password = await argon2.hash(this.password);

    // Remove passwordConfirm field from DB
    this.passwordConfirm = undefined;
    next();
  } catch (error) {
    next(error);
  }
});

// pre save hook for passwordChangedAt field
userSchema.pre('save', function (next) {
  // If the password is not modified or we are creating a new document then do not update the passwordChangedAt field
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  /* Sometimes saving the changes to the database can take longer than issuing the token, so the passwordChangedAt time will be after the token was issued and then the user won't be able to login,
  So putting it one second in the past will make sure that token is always created after the password was changed. */
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

// Query Middleware - This will run before methods that start with find, ex- findById, findByIdAndUpdate
// This middleware will run before the query

userSchema.pre(/^find/, function (next) {
  // 'this' refers to the query, here we are getting the active users
  this.find({ active: { $ne: false } });

  next();
});

// Instance Method: A method that is available on every document of a collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  try {
    // Verify password using Argon2
    return await argon2.verify(userPassword, candidatePassword);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

// Instance Method
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(
      this.passwordChangedAt.getTime() / 1000,
    );

    /* console.log('\nTimestamp Debug:');
    console.log('JWT Timestamp:', new Date(JWTTimestamp * 1000).toISOString());
    console.log('Password Changed At:', this.passwordChangedAt.toISOString());

    console.log('Converted Timestamps for Comparison:');
    console.log('Password Changed:', changedTimestamp);
    console.log('JWT Created:', JWTTimestamp);
    console.log('Difference in seconds:', JWTTimestamp - changedTimestamp); */

    // If true, it means that Password was changed after the token was issued
    return JWTTimestamp < changedTimestamp;
  }

  // False means password was not changed
  return false;
};

// Instance Method: Generates Reset Token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hashing the reset token and storing in db
  // This only modifies the data but does not save it, we have to use the save() method to see these changes in db
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  // Reset token will expire after the specified time (10 mins in this case)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;
