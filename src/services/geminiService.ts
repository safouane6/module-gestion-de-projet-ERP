import OpenAI from 'openai';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

const groq = new OpenAI({
    apiKey: groqApiKey,
    dangerouslyAllowBrowser: true,
    baseURL: "https://api.groq.com/openai/v1",
});

export async function generateProjectWBS(projectDescription: string): Promise<string> {
    const response = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are a project management expert. Generate a Work Breakdown Structure (WBS) for the given project description. Return ONLY a JSON array of objects with 'name' and 'dependencies' (array of strings) fields. The dependencies should refer to other task names generated."
            },
            {
                role: "user",
                content: projectDescription
            },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '[]';
    // Handle cases where the model might wrap the array in an object
    const parsed = JSON.parse(content);
    return JSON.stringify(Array.isArray(parsed) ? parsed : (parsed.tasks || parsed.wbs || []));
}

export async function generateStatusReport(data: { project: any; tasks: any[] }): Promise<string> {
    const { project, tasks } = data;
    const projectContext = `
        Project Name: ${project.name}
        Code: ${project.code}
        Description: ${project.description}
        Budget: ${project.budget}
        Status: ${project.status}
        Tasks: ${JSON.stringify(tasks.map(t => ({ name: t.name, status: t.status, progress: t.progress })))}
    `;

    const response = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are a professional project manager. Generate a high-level executive status report for the project based on the provided data. Use markdowns for formatting."
            },
            {
                role: "user",
                content: projectContext
            },
        ],
        model: "llama-3.3-70b-versatile",
    });

    return response.choices[0].message.content || 'No report generated.';
}

export async function analyzeCRImpact(changeDescription: string, context: string): Promise<string> {
    const response = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are a Change Advisory Board (CAB) expert. Analyze the impact of the following change request within the given project context. Focus on risks, resources, and timeline impact."
            },
            {
                role: "user",
                content: `Change Description: ${changeDescription}\n\nProject Context: ${context}`
            },
        ],
        model: "llama-3.3-70b-versatile",
    });

    return response.choices[0].message.content || 'No analysis generated.';
}

export async function chatAssistant(messages: any[]): Promise<string> {
    const response = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are a helpful project management assistant for the Nexus ERP. Help the user with writing project descriptions, planning, or any project-related questions. If you provide a draft for a project description, please wrap the actual description text in [CONTENT] ... [/CONTENT] tags so the system can extract it cleanly without your conversational talk."
            },
            ...messages
        ],
        model: "llama-3.3-70b-versatile",
    });

    return response.choices[0].message.content || 'I am sorry, I could not process that.';
}

