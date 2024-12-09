import { GithubData } from '../services/github.service.js';

export async function getRepositoryData(req, res) {
  try {
    const token = process.env.TOKEN;
    const query = req.query.query;

    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }
    if (!query) {
      return res.status(400).json({ error: 'Repository query is required' });
    }

    const githubData = new GithubData(token);
    const data = await githubData.getData(query);
    res.json(data);
  } catch (error) {
    console.error('Error fetching repository data:', error);
    res.status(500).json({ error: error.message });
  }
}