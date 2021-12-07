const path = require('path');
const fs = require('fs')

const { validationResult } = require('express-validator')

const Post = require('../models/post');
const User = require('../models/user')

const errorFunc = (err) => {
    if(!err.statusCode) {
        err.statusCode = 500;
    }
}

const postValidation = (post) => {
    if(!post) {
        const error = new Error("Couldn't find post!");
        error.statusCode = 404;
        throw error
    }
}

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    Post.find().countDocuments()
    .then(count => {
        totalItems = count;
       return Post.find()
           .skip((currentPage - 1) * perPage)
           .limit(perPage)
}).then(
    posts => {
        res.status(200).json({
            posts: posts, 
            totalItems: totalItems
        })
    }
)    .catch(err => {
        errorFunc(err)
    next(err)

    }
    )
    
};

exports.postPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is invalid.');
        error.statusCode = 422;
        throw error;
    }

    if(!req.file) {
        const error = new Error('No image provided.')
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path.replace("\\","/");
    const title = req.body.title;
    const content = req.body.content;
    let creator
    const post = new Post({
        title: title, 
        content: content, 
        imageUrl: imageUrl,
        creator: req.userId   
    })
    post.save()
    .then(result => {
        return User.findById(req.userId)
    })
    .then(user => {
        creator = user;
        user.posts.push(post);
        return user.save()
    })
    .then(result => {
        res.status(201).json({
            message: 'Post created successfully',
            post: post,
            creator: {
                _id: creator._id, name: creator.name
            }
        })
        
    })
    .catch(err => {
        errorFunc(err)
    next(err)

    });
    }

    exports.getPost = (req, res, next) => {
        const postId = req.params.postId;
        Post.findById(postId)
        .then(post => {
            postValidation(post);
            res.status(200).json({
                message: 'Post fetched.', 
                post: post
            })
        })
        .catch(err => 
            {
                errorFunc(err)
    })
    }

    exports.updatePost = (req, res, next) =>{
        const postId = req.params.postId;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Validation failed, entered data is invalid.');
            error.statusCode = 422;
            throw error;
    }
        const title = req.body.title;
        const content = req.body.content;
        let imageUrl = req.body.image;
        if (req.file) {
            imageUrl =  req.file.path.replace("\\","/");
        }
        if(!imageUrl) {
            const error = new Error('No file picked');
            error.statusCode = 422;
            throw error
        }
        Post.findById(postId)
        .then(post => {
            postValidation(post)
            if (post.creator.toString !== req.userId) {
                const error = new Error ('Not authenticated')
                error.statusCode = 403;
                throw error
            }
            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl)
            }
            post.title = title;
            post.image = imageUrl;
            post.content = content;
            return post.save()
        })
        .then(result => {
            res.status(200).json({
                message: 'Post Updated!',
                post: result
            })
        })
        .catch(err => 
            {
                errorFunc(err)
    next(err)

    })
    };

    

    exports.deletePost = (req, res, next) => {
        const postId = req.params.postId;
        Post.findById(postId)
        .then(post =>{
            // Check logged in user
            postValidation(post)
            if (post.creator.toString() !== req.userId) {
                const error = new Error ('Not authenticated')
                error.statusCode = 403;
                throw error
            }
            clearImage(post.imageUrl)
            return Post.findByIdAndRemove(postId)
        })
        .then(result => {
            return User.findById(req.userId)
            
        })
        .then(user => {
            user.posts.pull(postId)
            return user.save()
        })
        .then(result => {
            res.status(200).json({
                message: 'Deleted Post'
            })
        })
        .catch( err =>
            {
                errorFunc(err)
    next(err)

    })
    }

    exports.getStatus = (req, res, next) => {
        let status;
        return User.findById(req.userId)
        .then(user => {
            if (!user) {
                const error = new Error('Not authenticated')
                error.statusCode = 401;
                throw error;
            }
            status = user.status;
        })
        .then(result => {
            res.status(200).json({status : status})
        })
        .catch(err =>
            {
                errorFunc(err)
            next(err)

    })

    }

    exports.updateStatus = (req, res, next) => {
        const status = req.body.status
        let updatedStatus
        User.findById(req.userId)
        .then(user => {
            if (!user) {
                const error = new Error('Not authenticated')
                error.statusCode = 401;
                throw error;
            }
            updatedStatus = user.status = status
            return user.save();
        })
        .then(result => {
            res.status(201).json({
                message: 'Status updated!'})
        })
        .catch(err =>
            {
                errorFunc(err)
            next(err)

    })
    }

    const clearImage = filePath => {
        filePath = path.join(__dirname, '..', filePath);
        fs.unlink(filePath, err => {console.log(err)})
    }