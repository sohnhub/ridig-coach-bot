const axios = require('axios');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location } = req.body;

  if (!location) {
    return res.status(400).json({ error: '지역명이 없습니다.' });
  }

  // ✅ 지역명 한글 → OpenWeather 도시명 매핑
  const cityMap = {
    "잠실": "Seoul,KR",
    "강남": "Seoul,KR",
    "서울": "Seoul,KR",
    "부산": "Busan,KR",
    "대구": "Daegu,KR",
    "인천": "Incheon,KR",
    "제주": "Jeju,KR",
    "광주": "Gwangju,KR",
    "수원": "Suwon,KR",
    "대전": "Daejeon,KR",
    "울산": "Ulsan,KR"
  };

  const mappedLocation = cityMap[location] || `${location},KR`;

  try {
    const weatherRes = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: mappedLocation,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'kr',
      },
    });

    const { temp } = weatherRes.data.main;
    const wind = weatherRes.data.wind.speed;

    const prompt = `오늘 ${location}에서 자전거를 탈 예정이야. 현재 기온은 ${temp}도이고 풍속은 ${wind}m/s야. 어떤 복장을 입는 게 좋을까? 자전거 라이더 기준으로 실용적으로 조언해줘.`;

    const gptRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '너는 숙련된 자전거 복장 코치야. 너무 장황하게 말하지 말고 실용적인 팁만 줘.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const gptReply = gptRes.data.choices[0].message.content.trim();

    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: `✅ ${location} 복장 추천\n기온: ${temp}℃ / 풍속: ${wind}m/s\n\n${gptReply}`,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: '서버 오류' });
  }
};

