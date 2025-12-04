import express from "express";
import * as main from "../controllers/index.js";
import { userAuthentication } from "../middlewares/userAuthentication.js";
import { csrfTokenValidation } from "../middlewares/validateCsrfToken.js";
import {
    commentIDValidation,
    commentInputValidation,
    likeIDValidation,
    postIDValidation,
    postInputValidation,
    startQueryValidation,
} from "../middlewares/inputValidator.js";

export const postRoutes = express.Router();

postRoutes.post("/add/post", userAuthentication, csrfTokenValidation, postInputValidation, main.createPost);
postRoutes.post("/add/like/:postID", userAuthentication, csrfTokenValidation, postIDValidation, main.addLike);
postRoutes.post("/add/comment/:postID", userAuthentication, csrfTokenValidation, postIDValidation, commentInputValidation, main.addComment);

postRoutes.delete("/del/post/:postID", userAuthentication, csrfTokenValidation, postIDValidation, main.deletePost);
postRoutes.delete("/del/like/:postID/:likeID", userAuthentication, csrfTokenValidation, postIDValidation, likeIDValidation, main.deleteLike);
postRoutes.delete("/del/comment/:postID/:commentID", userAuthentication, csrfTokenValidation, postIDValidation, commentIDValidation, main.deleteComment);

postRoutes.get("/like/count/:postID", userAuthentication, postIDValidation, main.getLikeCount);
postRoutes.get("/like/:postID", userAuthentication, postIDValidation, startQueryValidation, main.getLikes);
postRoutes.get("/comment/count/:postID", userAuthentication, postIDValidation, main.getCommentCount);
postRoutes.get("/comment/:postID", userAuthentication, postIDValidation, startQueryValidation, main.getComments);
postRoutes.get("/post/connections", userAuthentication, startQueryValidation, main.getPostsOfconnections);
postRoutes.get("/post/trending", userAuthentication, main.getTrendingPosts);
postRoutes.get("/post/user", userAuthentication, startQueryValidation, main.getUserOwnPosts);
postRoutes.get("/post/:postID", postIDValidation, main.getPost);
