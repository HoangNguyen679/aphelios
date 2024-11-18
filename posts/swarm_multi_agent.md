---
title: "Swarm - Run Multi-Agent Systems from Simple Ideas"
date: "2024-11-18"
---

<!-- vscode-markdown-toc -->
* [Prerequisites](#Prerequisites)
	* [Basic Knowledge of LLMs](#BasicKnowledgeofLLMs)
	* [Function Calling](#FunctionCalling)
	* [Basic Knowledge of Agents](#BasicKnowledgeofAgents)
* [What is Swarm?](#WhatisSwarm)
* [Using Swarm in Production is Not Recommended ⚠️](#UsingSwarminProductionisNotRecommended)
* [References](#References)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

In October 2024, OpenAI released a repository named "Swarm". Its purpose is lightweight multi-agent orchestration specifically for experimentation. This article explains how to build multi-agent systems using Swarm. Let's get started.

## <a name='Prerequisites'></a>Prerequisites

### <a name='BasicKnowledgeofLLMs'></a>Basic Knowledge of LLMs

Recently, Large Language Models (LLMs) like ChatGPT and Claude have become widely known. These models learn from vast amounts of data and answer users' questions. However, LLMs cannot understand the latest information that they haven't learned yet, specialized data, or internal organizational data. In such cases, LLMs may respond with "I don't know" or provide incorrect information (hallucination).

To solve this problem, there are the following methods:

❶ Provide as much context information as possible in the question.

❷ Function calling: Define specific functions that return necessary information.

❸ Reference external knowledge (RAG): Necessary information is vectorized and stored in external storage, and the LLM retrieves data from that storage.

In this article, we will use method ❷ as a sample program.

### <a name='FunctionCalling'></a>Function Calling

LLMs can obtain specific information by utilizing external functions. For example, OpenAI's ChatGPT can call functions during requests. Let's look at the following example:

```python
def get_temperature(location: str):
    """
    Get the temperature of a specific location
    """
    if location == "Tokyo":
        return 18
    elif location == "Hanoi":
        return 25

    return 20

```

The schema corresponding to this function is as follows:

```json
{
    "type": "function",
    "function": {
        "name": "get_temperature",
        "description": "Get the temperature of a specific location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string"
                }
            },
            "required": [
                "location"
            ]
        }
    }
}

```

With this schema, the LLM can understand the function's information and call the function according to the question. The clearer the description, the more accurate the LLM's judgment will be.

<img src="/images/swarm-llm-func.png" />

As you can see in the image, users communicate with an agent rather than directly with the LLM. The LLM decides whether to call a function or not. (In the context of an LLM specialized in executing tasks, we'll use the term "agent" instead of LLM from here on.)

Of course, as the number of functions increases, the input data in the API request increases, and the cost of input tokens also rises.

### <a name='BasicKnowledgeofAgents'></a>Basic Knowledge of Agents

While function calling is convenient, real applications involve more than simple questions like "What's the temperature in Tokyo?". As tasks become more complex, system prompts tend to get longer. Abstract explanations can lead to abstract understanding by agents, making them more prone to hallucinations. Therefore, it's important to improve accuracy by processing tasks step by step. OpenAI calls these multi-step tasks "Routines".

There are many multi-step tasks in our daily lives. For example, the steps to "set good goals" might be as follows:

- Step 1: Review team/organization goals
- Step 2: Identify the next level to aim for
- Step 3: Set goals
- Step 4: Get review from a mentor
- Step 5: Reflect the review feedback in the goals
- Step 6: (Optional) Share the goals with the team/organization

By breaking it down into multiple steps, each step's role becomes smaller and responsibilities become clearer.

However, what if each step becomes more complex? In that case, it becomes difficult to determine which step is being implemented. Generally, agents tend to be more accurate when specializing in specific fields rather than understanding multiple fields simultaneously.

## <a name='WhatisSwarm'></a>What is Swarm?

Swarm is a mechanism for coordinating agents with each other, based on the technology of function calling.

It becomes possible for agents to call other agents in the same way as function calling. This allows each step to be handled by specialized agents. If a specialized agent cannot handle a task, it can delegate the task to another specialized agent.

<img src="/images/swarm-flow-chart.png" />

For example, let's say you want to create a support bot for a company. It needs to handle the following tasks:

- Preparing emails
- Schedule coordination

To accomplish this task, we create three agents:

❶ Operator Agent: Determines the next action to take based on user input and hands over to specialized agents

❷ Email Agent: Responsible for email creation

❸ Schedule Agent: Responsible for schedule coordination

It will be easier to understand by looking at the code:

```python
operator_agent = Agent(
    name="Operator Agent",
    instructions="Determine which agent is best suited to handle the user's request, and transfer the conversation to that agent.",
)

email_agent = Agent(
    name="Email Agent",
    instructions="You are the email agent. You are responsible for write email requests.",
)

def transfer_to_email():
    return email_agent

operator_agent.functions = [transfer_to_email]

#####

client = Swarm()

response = client.run(
    agent=operator_agent,
    messages=messages,
)

```

## <a name='UsingSwarminProductionisNotRecommended'></a>Using Swarm in Production is Not Recommended ⚠️

There are risks in using Swarm in production environments for the following reasons:

- Lack of asynchronous processing and security features
- No mechanism for storing chat history
- While suitable for flow-based tasks, it's not suitable for self-improvement and reflection cases. Reasons:
    - Since the parent agent delegates to child agents, requests flow like a waterfall, making reverse feedback from child to parent difficult.
    - Being rule-based, it lacks flexibility and is difficult to handle heavy tasks.

For these reasons, while Swarm is suitable for experiencing multi-agent systems for learning purposes, it's not recommended for use in production environments. It's best utilized solely for learning purposes.

## <a name='References'></a>References

- https://github.com/openai/swarm
- https://github.com/HoangNguyen689/swarm-playground