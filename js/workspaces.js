
export const is_workspace_consumer = function (app, node_type) {
    return app.ui_features && app.ui_features[node_type] && app.ui_features[node_type].includes("workspace_consumer");
}
export const is_workspace_producer = function (app, node_type) {
    return app.ui_features && app.ui_features[node_type] && app.ui_features[node_type].includes("workspace_producer");
}

export const findUpstreamWorkspace = async function (app, node) {
    const DEBUG = false;
    if (DEBUG) console.log("[", node.id, "] findUpstreamWorkspace:");
    if (DEBUG) console.log("[", node.id, "]   - node: ", node);
    
    if (node.graph == undefined || node.graph == null) {
        if (DEBUG) console.log("[", node.id, "]   - graph is not yet defined");
        return null;
    }

    const slotIndex = node.findInputSlot("workspace");
    if (slotIndex == -1) {
        if (DEBUG) console.log("[", node.id, "]   > no workspace input slot");
        return;
    }
    const inputLink = node.getInputLink(slotIndex);
    if (!inputLink) {
        if (DEBUG) console.log("[", node.id, "]   > workspace input slot not connected");
        return node;
    }

    if (DEBUG) console.log("[", node.id, "]   > workspace links to ", inputLink.origin_id);
    const upstreamNode = node.graph.getNodeById(inputLink.origin_id);

    if (app.ui_features
    && app.ui_features[node.type]
    && app.ui_features[node.type].includes("workspace_consumer")
    && app.ui_features[node.type].includes("workspace_producer")
    ) {
        if (DEBUG) console.log("[", node.id, "]   > ", inputLink.origin_id, " is a workspace_chainlink, moving in");
        return findUpstreamWorkspace(app, upstreamNode);
    }

    // if (upstreamNode.type === "fot_Folder") {
    //     if (DEBUG) console.log("[", node.id, "]   > ", inputLink.origin_id, " is a fot_Folder, moving in");
    //     return findUpstreamWorkspace(app, upstreamNode);
    // }

    if (upstreamNode.type.startsWith("fot_Workspace")) {
        if (DEBUG) console.log("[", node.id, "]   > ", inputLink.origin_id, " is a fot_Workspace*");
        const upstreamSlotIndex = upstreamNode.findInputSlot("workspace");
        if (upstreamSlotIndex !== -1) {
            const upstreamInputLink = upstreamNode.getInputLink(upstreamSlotIndex);
            if (upstreamInputLink) {
                if (DEBUG) console.log("[", node.id, "]   > workspace is linked, recursing to ", upstreamNode.id);
                return findUpstreamWorkspace(app, upstreamNode);
            }
            if (DEBUG) console.log("[", node.id, "]   > workspace is not linked");
        }
        else {
            if (DEBUG) console.log("[", node.id, "]   > no workspace input slot for ", upstreamNode.id);
        }

        return upstreamNode;
    }

    if (upstreamNode.type === "Reroute") {
        if (DEBUG) console.log("[", node.id, "]   > upstream node (", upstreamNode.id, ") is a reroute: ", upstreamNode);
        const upstreamSlotIndex = upstreamNode.findInputSlot("");
        if (upstreamSlotIndex !== -1) {
            if (DEBUG) console.log("[", node.id, "]   > upstream reroute node (", upstreamNode.id, ") has an '' input slot (", upstreamSlotIndex, ")");
            const nextUpstreamNodeIdOrNode = upstreamNode.getInputNode(upstreamSlotIndex);
            if (DEBUG) console.log("[", node.id, "]   > upstream reroute node (", upstreamNode.id, ") '' input node: ", nextUpstreamNodeIdOrNode);
            if (nextUpstreamNodeIdOrNode) {
                let nextUpstreamNode;
                if (typeof nextUpstreamNodeIdOrNode === "number") {
                    nextUpstreamNode = node.graph.getNodeById(nextUpstreamNodeIdOrNode);
                }
                else {
                    nextUpstreamNode = nextUpstreamNodeIdOrNode;
                }
                if (DEBUG) console.log("[", node.id, "]   > recursing upstream to ", nextUpstreamNode.id);
                return findUpstreamWorkspace(app, nextUpstreamNode);
            }
            else {
                if (DEBUG) console.log("[", node.id, "]   > upstream reroute node (", upstreamNode.id, ") is not linked");
                return null;
            }
        }
        else {
            if (DEBUG) console.log("[", node.id, "]   > upstream reroute node (", upstreamNode.id, ") has no '' input slot");
            return null;
        }
    }

    console.log("app.ui_features[node.type] = ", app.ui_features[node.type]);

    throw new Error("Unexpected, workspace is not a fot_Workspace* or a Reroute! it is a " + upstreamNode.type);
};

export const findDownstreamNodes = async function (app, node) {
    const slotIndex = node.findOutputSlot("workspace");
    if (slotIndex == -1) {
        return [];
    }
    const outputNodes = node.getOutputNodes(slotIndex);
    // console.log(" - outputNodes = ", outputNodes);

    if (outputNodes === null) {
        return [];
    }

    // if (app.ui_features
    // && app.ui_features[node.type]
    // && app.ui_features[node.type].includes("workspace_consumer")
    // && app.ui_features[node.type].includes("workspace_producer")
    // ) {

    const mynodes = outputNodes.filter((node) => node.type.startsWith("fot_"));
    // console.log(" - mynodes = ", mynodes);

    let downstreamNodes = []
    for (const node of mynodes) {
        const downstreams = await findDownstreamNodes(app, node);
        downstreamNodes = downstreamNodes.concat([node]).concat(downstreams);
    }

    // console.log(" - downstream nodes = ", mynodes);
    return downstreamNodes;
};

export const updateWorkspaceCodename = async function (app, node) {
    // console.log("refreshPoses, findUpstreamWorkspace: ", node.id);
    let upstreamNode = await findUpstreamWorkspace(app, node);

    let workspace_codename = undefined;
    // console.log(" - upstreamNode: ", upstreamNode);
    // if (upstreamNode != null) console.log(" - upstreamNode.workspace_codename: ", upstreamNode.workspace_codename);
    if (upstreamNode != null && upstreamNode.workspace_codename) {
        workspace_codename = upstreamNode.workspace_codename;
    }

    // console.log("(", node.id, ") refreshCharacters, workspace_codename: ", workspace_codename);
    node.workspace_codename = workspace_codename;
    if (workspace_codename == undefined) {
        return;
    }
    return workspace_codename;
}
