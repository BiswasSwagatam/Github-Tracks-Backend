import express from 'express';
import { getRepositoryData } from '../controllers/github.controller.js';

export const router = express.Router();

router.post('/reponame', getRepositoryData);