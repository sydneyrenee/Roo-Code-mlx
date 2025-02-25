import { MistralHandler } from "../mistral";
import { ApiHandlerOptions } from "../../../shared/api";

describe("MistralHandler", () => {
    let handler: MistralHandler;
    let mockOptions: ApiHandlerOptions;

    beforeEach(() => {
        mockOptions = {
            apiModelId: "codestral-latest",
            mistralApiKey: "test-api-key",
        };
        handler = new MistralHandler(mockOptions);
    });

    describe("constructor", () => {
        it("should initialize with provided options", () => {
            expect(handler).toBeInstanceOf(MistralHandler);
            expect(handler.getModel().id).toBe(mockOptions.apiModelId);
        });

        it("should throw error if API key is missing", () => {
            expect(() => {
                new MistralHandler({
                    apiModelId: "codestral-latest",
                    mistralApiKey: "",
                });
            }).toThrow("Mistral API key is required");
        });
    });

    describe("getModel", () => {
        it("should return correct model info", () => {
            const model = handler.getModel();
            expect(model.id).toBe(mockOptions.apiModelId);
            expect(model.info).toBeDefined();
            expect(model.info.supportsPromptCache).toBe(false);
            expect(model.info.maxTokens).toBe(256_000);
            expect(model.info.contextWindow).toBe(256_000);
            expect(model.info.inputPrice).toBe(0.3);
            expect(model.info.outputPrice).toBe(0.9);
        });

        it("should use default model if none specified", () => {
            const handlerWithoutModel = new MistralHandler({
                mistralApiKey: "test-api-key",
            });
            const model = handlerWithoutModel.getModel();
            expect(model.id).toBe("codestral-latest");
            expect(model.info).toBeDefined();
        });
    });
});
