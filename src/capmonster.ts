import axios from "axios";
import { CreateTask, TaskResult } from "./types";

export default class CapMonster {
    constructor(public apiKey: string) { }

    async createTask(type: string, websiteURL: string, websiteKey: string, isInvisible?: boolean) {
        const task: CreateTask = await axios.post("https://api.capmonster.cloud/createTask", {
            clientKey: this.apiKey,
            task: {
                type,
                websiteURL,
                websiteKey,
                isInvisible
            }
        }).then(res => res.data);

        if (task.errorId > 0) {
            throw new Error(task.errorDescription);
        }

        return task.taskId;
    }

    async getTaskResult(taskId: number) {
        const taskResult: TaskResult = await axios.post("https://api.capmonster.cloud/getTaskResult", {
            clientKey: this.apiKey,
            taskId
        }).then(res => res.data);

        if (taskResult.errorId > 0) {
            throw new Error(taskResult.errorDescription ?? taskResult.errorCode ?? taskResult.errorId.toString());
        }

        return {
            success: taskResult.status === "ready",
            solution: taskResult.solution?.gRecaptchaResponse
        };
    }

    async awaitTaskResult(taskId: number) {
        for (let i = 0; i < 20; i++) {
            const taskResult = await this.getTaskResult(taskId);

            if (taskResult.success) {
                return {
                    success: true,
                    solution: taskResult.solution
                };
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        return {
            success: false
        };
    }
}