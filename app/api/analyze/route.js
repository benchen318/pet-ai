import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. 获取前端传过来的文本描述和 Base64 图片数组
    const { text, images } = await request.json();

    // 2. 内置兽医级系统 Prompt
    const systemPrompt = `你是一位经验丰富的专业宠物医生（兽医师）。你的任务是分析主人上传的宠物排泄物（便便）图片、视频关键帧及症状描述。
请按照以下结构给出专业、严谨且温和的诊断建议：

1. 🔍 **形态与颜色分析**：评估便便的成型度（参考布里斯托宠物便便分类法）、颜色（红/黑/黄/绿/灰等）、黏液或异物情况。
2. 💡 **潜在原因排查**：分析可能的饮食因素、寄生虫、应激反应、消化系统异常或感染。
3. 🩺 **护理与观察建议**：给出家庭护理建议（如禁食观察、补充益生菌、补水等）及未来 24-48 小时需重点观察的指标。
4. 🚨 **紧急就医预警**：明确指出哪些危险症状（如持续吐血/便血、精神高度萎靡、剧烈腹痛等）必须立即送去宠物医院。

⚠️ 声明：你的回答仅作为初步健康参考，不能替代线下面诊。`;

    // 3. 构建多模态请求 Payload
    const content = [];

    if (text) {
      content.push({ type: 'text', text: text });
    }

    if (images && Array.isArray(images)) {
      images.forEach((imgDataUrl) => {
        content.push({
          type: 'image_url',
          image_url: {
            url: imgDataUrl
          }
        });
      });
    }

    // 4. 发起 HTTP 请求调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'DeepSeek API 调用失败');
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || '未能生成分析报告，请稍后再试。';

    return NextResponse.json({ success: true, result: aiMessage });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器分析出错' },
      { status: 500 }
    );
  }
}
