IMAGE ?= os7-gpt-card:dev
AGENT_TOOLS_IMAGE ?= os7-agent-tools:local

.PHONY: docker-build

docker-build:
	docker build --build-arg AGENT_TOOLS_IMAGE=$(AGENT_TOOLS_IMAGE) -t $(IMAGE) .
