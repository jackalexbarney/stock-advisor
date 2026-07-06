import axios from 'axios';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

export async function fetchNewsHeadlines(symbol) {
  if (!NEWSAPI_KEY) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${symbol}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWSAPI_KEY}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    return data?.articles ?? [];
  } catch {
    return [];
  }
}
