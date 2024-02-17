import Post from "../models/post.model.mjs";
import { errorHandler } from "../utils/error.mjs";

export const createBlog = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(
      errorHandler(403, "You do not have permission to create a blog.")
    );
  }
  if (!req.body.title || !req.body.content) {
    return next(errorHandler(403, "Please provide all required fields"));
  }

  const slug = req.body.title
    .toLowerCase()
    .split(/\s+/)
    .join("-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-") // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove hyphens from beginning and end

  const newPost = new Post({
    ...req.body,
    slug,
    userId: req.user.id,
  });
  try {
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    next(errorHandler());
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;
    const posts = await Post.find({
      ...(req.query.userId && { userId: req.query.userId }),
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.slug && { slug: req.query.slug }),
      ...(req.query.postId && { _id: req.query.postId }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.content, $options: "i" } },
        ],
      }),
    })
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthPosts = await Post.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });
    res.status(200).json({
      posts,
      totalPosts,
      lastMonthPosts
    })
  } catch (error) {
    next(errorHandler());
  }
};