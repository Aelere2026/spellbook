import requests

url = "https://gamma-api.polymarket.com/markets"
params = {
    "active": True,
    "closed": False,
    "limit": 100
}

response = requests.get(url, params=params)
markets = response.json()

for market in markets[:5]:
    print(market["question"])
