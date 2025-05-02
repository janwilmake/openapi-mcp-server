//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const getApiOverviewEval: EvalFunction = {
    name: "getApiOverviewEval",
    description: "Evaluates the getApiOverview tool's ability to provide an overview of an OpenAPI specification",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Given the ID 'petstore', retrieve an overview of the OpenAPI specification.");
        return JSON.parse(result);
    }
};

const getApiOperationEval: EvalFunction = {
    name: "getApiOperation Tool Evaluation",
    description: "Evaluates the getApiOperation tool",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Retrieve the operation details for id 'petstore' and operationIdOrRoute 'addPet' from the OpenAPI specification.");
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [getApiOverviewEval, getApiOperationEval]
};
  
export default config;
  
export const evals = [getApiOverviewEval, getApiOperationEval];