// This file handles the Figma API interactions
import {createPropertyDocumentationTable, handlePropertyTableMessage } from './propertyTableController';
figma.showUI(__html__, { width: 400, height: 600 });

// Add this at the top after imports
const FREE_USAGE_LIMIT = 10;

figma.on("selectionchange",async () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 1) {
    const selected = selection[0];

    // Check if selected node is a ComponentSet or Component
    if (selected.type === "COMPONENT_SET") {
     await sendComponentData(selected);
    } else if (selected.type === "COMPONENT") {
      // If it's a single component, check if it has a parent ComponentSet
      if (selected.parent && selected.parent.type === "COMPONENT_SET") {
       await sendComponentData(selected.parent as ComponentSetNode);
      } else {
        // Single component without variants
        await sendSingleComponentData(selected);
      }
    } else if (selected.type === "INSTANCE") {
      // If instance is selected, get its main component
      const mainComponent = await selected.getMainComponentAsync();
      if (
        mainComponent &&
        mainComponent.parent &&
        mainComponent.parent.type === "COMPONENT_SET"
      ) {
       await sendComponentData(mainComponent.parent as ComponentSetNode);
      } else if (mainComponent) {
        await sendSingleComponentData(mainComponent);
      }
    } else {
      // Not a component-related selection
      figma.ui.postMessage({
        type: "selection-cleared",
      });
    }
  } else {
    // No selection or multiple selection
    figma.ui.postMessage({
      type: "selection-cleared",
    });
  }
});

// Helper function to send ComponentSet data
async function sendComponentData(componentSet: ComponentSetNode) {
  const properties: ComponentProperty[] = [];

  // Extract all component properties
  for (const [propertyName, property] of Object.entries(
    componentSet.componentPropertyDefinitions
  )) {
    if (property.type === "VARIANT") {
      properties.push({
        name: propertyName,
        type: "VARIANT",
        values: property.variantOptions || [],
      });
    } else if (property.type === "BOOLEAN") {
      properties.push({
        name: propertyName,
        type: "BOOLEAN",
        values: ["true", "false"],
      });
    }
  }

  // Add exposed instance properties
  const exposedProperties = await getExposedInstanceProperties(componentSet);
  properties.push(...exposedProperties);

  figma.ui.postMessage({
    type: "component-selected",
    data: {
      id: componentSet.id,
      name: componentSet.name,
      properties,
    },
  });
}

// Add this function after the existing helper functions
const resetUsageCount = async () => {
  await figma.clientStorage.setAsync("usage-count", 0);
  figma.notify("Usage count reset to 0");
  figma.ui.postMessage({
    type: "update-usage",
    usageCount: 0,
    isPaid: figma.payments.status.type === "PAID",
  });
};
const cleanPropertyName = (name) => {
  return name.split('#')[0];
};


// Add this function for development testing
const toggleDevPaymentStatus = () => {
  if (figma.payments.status.type === "UNPAID") {
    figma.payments.setPaymentStatusInDevelopment({ type: "PAID" });
    figma.notify("Dev mode: Payment status set to PAID");
  } else {
    figma.payments.setPaymentStatusInDevelopment({ type: "UNPAID" });
    figma.notify("Dev mode: Payment status set to UNPAID");
  }
};

// Helper function to send single Component data
async function sendSingleComponentData(component: ComponentNode) {
  const properties: ComponentProperty[] = [];

  // Get exposed instance properties for single component
  const exposedProperties = await getExposedInstanceProperties(component);
  properties.push(...exposedProperties);

  figma.ui.postMessage({
    type: "component-selected",
    data: {
      id: component.id,
      name: component.name,
      properties,
    },
  });
}

interface ComponentProperty {
  name: string;
  type: "VARIANT" | "BOOLEAN" | "EXPOSED_INSTANCE";
  values: string[];
}

interface ComponentInfo {
  id: string;
  name: string;
  properties: ComponentProperty[];
}

// Helper function to create auto-layout frames
function createAutoLayoutFrame(
  name: string,
  direction: "HORIZONTAL" | "VERTICAL" = "VERTICAL"
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = direction;
  frame.fills = [];
  frame.clipsContent = false;
  return frame;
}

// Generate all combinations of component properties (variants + booleans + exposed instances)
function generateCombinations(
  properties: ComponentProperty[]
): Record<string, string>[] {
  if (properties.length === 0) return [{}];

  const [first, ...rest] = properties;
  const restCombinations = generateCombinations(rest);

  const combinations: Record<string, string>[] = [];

  for (const value of first.values) {
    for (const restCombination of restCombinations) {
      combinations.push({
        [first.name]: value,
        ...restCombination,
      });
    }
  }

  return combinations;
}

// Find all exposed instances within a component and extract their properties
// Find all exposed instances within a component and extract their properties
async function getExposedInstanceProperties(
  componentNode: ComponentNode | ComponentSetNode
): Promise<ComponentProperty[]> {
  const exposedProperties: ComponentProperty[] = [];

  async function traverseForExposedInstances(node: SceneNode, path: string = "") {
    if (node.type === "INSTANCE" && node.isExposedInstance) {
      const nodePath = path ? `${path}/${node.name}` : node.name;

      // Get the component properties of this exposed instance
      const instanceProperties = node.componentProperties;
      if (instanceProperties) {
        for (const [propertyName, property] of Object.entries(
          instanceProperties
        )) {
          const fullPropertyName = `${nodePath}/${propertyName}`;

          if (property.type === "VARIANT") {
            // ✅ FIX: Use async method to get main component
            const mainComponent = await node.getMainComponentAsync();
            if (
              mainComponent &&
              mainComponent.parent &&
              mainComponent.parent.type === "COMPONENT_SET"
            ) {
              const componentSet = mainComponent.parent as ComponentSetNode;
              const propertyDef =
                componentSet.componentPropertyDefinitions[propertyName];
              if (propertyDef && propertyDef.type === "VARIANT") {
                exposedProperties.push({
                  name: fullPropertyName,
                  type: "EXPOSED_INSTANCE",
                  values: propertyDef.variantOptions || [],
                });
              }
            }
          } else if (property.type === "BOOLEAN") {
            exposedProperties.push({
              name: fullPropertyName,
              type: "EXPOSED_INSTANCE",
              values: ["true", "false"],
            });
          } else if (property.type === "TEXT") {
            // For text properties, use the current value
            const currentValue = (property.value as string) || "Default Text";
            exposedProperties.push({
              name: fullPropertyName,
              type: "EXPOSED_INSTANCE",
              values: [currentValue],
            });
          }
        }
      }

      // Continue traversing children - using for...of instead of forEach for async
      if ("children" in node) {
        for (const child of node.children) {
          await traverseForExposedInstances(child, nodePath);
        }
      }
    } else if ("children" in node) {
      // Continue traversing with same path for non-exposed instances - using for...of instead of forEach for async
      for (const child of node.children) {
        await traverseForExposedInstances(child, path);
      }
    }
  }

  if (componentNode.type === "COMPONENT_SET") {
    // For component sets, only check the first component to avoid duplicates
    // since all variants should have the same exposed instance structure
    const firstComponent = componentNode.children.find(
      (child) => child.type === "COMPONENT"
    );
    if (firstComponent) {
      await traverseForExposedInstances(firstComponent);
    }
  } else {
    await traverseForExposedInstances(componentNode);
  }

  return exposedProperties;
}

// Find all component sets in the current page
async function findComponentSets(): ComponentInfo[] {
  const componentSets: ComponentInfo[] = [];

  async function traverse(node: SceneNode) {
    if (node.type === "COMPONENT_SET") {
      const properties: ComponentProperty[] = [];

      // Extract all component properties (variants and booleans)
      for (const [propertyName, property] of Object.entries(
        node.componentPropertyDefinitions
      )) {
        if (property.type === "VARIANT") {
          properties.push({
            name: propertyName,
            type: "VARIANT",
            values: property.variantOptions || [],
          });
        } else if (property.type === "BOOLEAN") {
          properties.push({
            name: propertyName,
            type: "BOOLEAN",
            values: ["true", "false"],
          });
        }
      }

      // Add exposed instance properties
      const exposedProperties = await getExposedInstanceProperties(node);
      properties.push(...exposedProperties);

      componentSets.push({
        id: node.id,
        name: node.name,
        properties,
      });
    }

    if ("children" in node) {
      node.children.forEach(traverse);
    }
  }

  figma.currentPage.children.forEach(traverse);
  return componentSets;
}

// Create visual brackets around groups
function createBracket(
  x: number,
  y: number,
  width: number,
  height: number,
  color = { r: 0.6, g: 0.4, b: 0.8 }
): RectangleNode[] {
  const brackets: RectangleNode[] = [];
  const thickness = 2;

  // Create dashed border effect
  const topLine = figma.createRectangle();
  topLine.x = x;
  topLine.y = y;
  topLine.resize(width, thickness);
  topLine.fills = [{ type: "SOLID", color }];
  topLine.dashPattern = [10, 5];
  brackets.push(topLine);

  const bottomLine = figma.createRectangle();
  bottomLine.x = x;
  bottomLine.y = y + height - thickness;
  bottomLine.resize(width, thickness);
  bottomLine.fills = [{ type: "SOLID", color }];
  bottomLine.dashPattern = [10, 5];
  brackets.push(bottomLine);

  const leftLine = figma.createRectangle();
  leftLine.x = x;
  leftLine.y = y;
  leftLine.resize(thickness, height);
  leftLine.fills = [{ type: "SOLID", color }];
  leftLine.dashPattern = [10, 5];
  brackets.push(leftLine);

  const rightLine = figma.createRectangle();
  rightLine.x = x + width - thickness;
  rightLine.y = y;
  rightLine.resize(thickness, height);
  rightLine.fills = [{ type: "SOLID", color }];
  rightLine.dashPattern = [10, 5];
  brackets.push(rightLine);

  return brackets;
}

// Apply exposed instance properties to an instance
// Apply exposed instance properties to an instance
function applyExposedInstanceProperties(
  instance: InstanceNode,
  combination: Record<string, string>
) {
  function traverseAndApply(node: SceneNode, path: string = "") {
    if (node.type === "INSTANCE" && node.isExposedInstance) {
      const nodePath = path ? `${path}/${node.name}` : node.name;

      // Apply properties that match this node's path
      for (const [propertyName, value] of Object.entries(combination)) {
        // Check if this property belongs to this exposed instance
        if (propertyName.startsWith(nodePath + "/")) {
          const actualPropertyName = propertyName.replace(nodePath + "/", "");

          try {
            const componentProperties = node.componentProperties;
            if (
              componentProperties &&
              componentProperties[actualPropertyName]
            ) {
              const property = componentProperties[actualPropertyName];

              if (property.type === "BOOLEAN") {
                node.setProperties({ [actualPropertyName]: value === "true" });
              } else if (property.type === "VARIANT") {
                node.setProperties({ [actualPropertyName]: value });
              } else if (property.type === "TEXT") {
                node.setProperties({ [actualPropertyName]: value });
              }

            
            }
          } catch (error) {
            console.warn(
              `❌ Could not set exposed instance property ${propertyName}:`,
              error
            );
          }
        }
      }

      // Continue traversing children with updated path
      if ("children" in node) {
        node.children.forEach((child) => traverseAndApply(child, nodePath));
      }
    } else if ("children" in node) {
      // Continue traversing with same path for non-exposed instances
      node.children.forEach((child) => traverseAndApply(child, path));
    }
  }

  traverseAndApply(instance);
}

async function createInstancesTable(
  componentId: string,
  combinations: Record<string, string>[],
  spacing: number = 20,
    layoutDirection?: string ,
      theme?: any // Add theme parameter
) {
   const currentTheme = theme || {
    primary: { r: 0.4, g: 0.2, b: 0.8 },
    secondary: { r: 0.94, g: 0.94, b: 0.98 },
    stroke: { r: 0.85, g: 0.85, b: 0.9 },
    accent: { r: 0.7, g: 0.4, b: 1 }
  };
    const node = await figma.getNodeByIdAsync(componentId);
  
  let componentSet: ComponentSetNode | null = null;
  let singleComponent: ComponentNode | null = null;
  
  if (node?.type === "COMPONENT_SET") {
    componentSet = node as ComponentSetNode;
  } else if (node?.type === "COMPONENT") {
    singleComponent = node as ComponentNode;
  } else {
  
    figma.notify("Please select a valid component or component set");
    return;
  }

  const instances: InstanceNode[] = [];

  // Load fonts first
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  } catch {
    try {
      await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
      await figma.loadFontAsync({ family: "Roboto", style: "Bold" });
    } catch {
      await figma.loadFontAsync({ family: "Arial", style: "Regular" });
      await figma.loadFontAsync({ family: "Arial", style: "Bold" });
    }
  }

  // Create all instances
 // Replace the variant finding logic with this:
// ✅ NEW - Create all instances
  combinations.forEach((combination) => {
    let sourceComponent: ComponentNode;
    
    if (singleComponent) {
      // For single components, always use that component
      sourceComponent = singleComponent;
    } else if (componentSet) {
      // For component sets, find the right variant
      const variantProps: Record<string, string> = {};
      const booleanProps: Record<string, boolean> = {};

      Object.entries(combination).forEach(([key, value]) => {
        const propertyDef = componentSet.componentPropertyDefinitions[key];
        if (propertyDef?.type === "VARIANT") {
          variantProps[key] = value;
        } else if (propertyDef?.type === "BOOLEAN") {
          booleanProps[key] = value === "true";
        }
      });

      // Handle case with no variant properties (only exposed instances)
      if (Object.keys(variantProps).length === 0) {
        sourceComponent = componentSet.children.find((child) => child.type === "COMPONENT") as ComponentNode;
      } else {
        sourceComponent = componentSet.children.find((child) => {
          if (child.type !== "COMPONENT") return false;
          const componentVariantProps = child.variantProperties;
          if (!componentVariantProps) return false;

          return Object.entries(variantProps).every(
            ([key, value]) => componentVariantProps[key] === value
          );
        }) as ComponentNode;
      }
    }

    if (sourceComponent) {
      const instance = sourceComponent.createInstance();

      // Apply properties based on component type
      if (singleComponent) {
        // For single components, all properties are exposed instance properties
        applyExposedInstanceProperties(instance, combination);
      } else if (componentSet) {
        // For component sets, handle different property types
        Object.entries(combination).forEach(([key, value]) => {
          const propertyDef = componentSet.componentPropertyDefinitions[key];
          if (propertyDef?.type === "BOOLEAN") {
            try {
              instance.setProperties({ [key]: value === "true" });
            } catch (error) {
              console.warn(`Could not set boolean property ${key}:`, error);
            }
          } else if (!propertyDef) {
            // This is an exposed instance property
            applyExposedInstanceProperties(instance, { [key]: value });
          }
        });
      }

      instances.push(instance);
    }
  });
  if (instances.length === 0) return;

  // Analyze properties dynamically
  const propertyKeys = Object.keys(combinations[0] || {});
  const propertyGroups: { [key: string]: string[] } = {};

  propertyKeys.forEach((key) => {
    propertyGroups[key] = [...new Set(combinations.map((combo) => combo[key]))];
  });

  // 🧠 OPTIMAL STRATEGY: Find best aspect ratio distribution
function getOptimalDistribution(forcedDirection?: string) {
   if (propertyKeys.length === 1) {
    if (forcedDirection === "vertical") {
      return {
        columnProperties: [],
        rowProperties: [propertyKeys[0]], // Put single property in rows for vertical
      };
    } else {
      // Default horizontal for single property
      return {
        columnProperties: [propertyKeys[0]],
        rowProperties: [],
      };
    }
  }
     if (forcedDirection === "horizontal") {
    return {
      columnProperties: propertyKeys,
      rowProperties: [],
    };
  }
  
  if (forcedDirection === "vertical") {
    return {
      columnProperties: propertyKeys.slice(0, 1),
      rowProperties: propertyKeys.slice(1),
    };
  }
    if (propertyKeys.length === 1) {
      return {
        columnProperties: [propertyKeys[0]],
        rowProperties: [],
      };
    }

    let bestDistribution = null;
    let bestScore = 0;
    const idealRatio = 1.6; // Golden ratio for optimal viewing

    // Try all possible ways to split properties between columns and rows
    for (let colCount = 1; colCount < propertyKeys.length; colCount++) {
      // Sort properties by value count for better distribution
      const sortedProps = propertyKeys.sort(
        (a, b) => propertyGroups[b].length - propertyGroups[a].length
      );

      const columnProps = sortedProps.slice(0, colCount);
      const rowProps = sortedProps.slice(colCount);

      // Calculate total columns and rows
      const totalCols = columnProps.reduce(
        (acc, prop) => acc * propertyGroups[prop].length,
        1
      );
      const totalRows = Math.max(
        1,
        rowProps.reduce((acc, prop) => acc * propertyGroups[prop].length, 1)
      );

      // Calculate aspect ratio
      const aspectRatio = totalCols / totalRows;

      // Score based on how close to ideal ratio (lower difference = better)
      // Also consider practical limits (not too many columns/rows)
      const ratioScore = 1 / (Math.abs(aspectRatio - idealRatio) + 0.1);
      const columnPenalty = totalCols > 12 ? 0.5 : 1; // Penalize too many columns
      const rowPenalty = totalRows > 20 ? 0.8 : 1; // Slight penalty for too many rows

      const score = ratioScore * columnPenalty * rowPenalty;

     

      if (score > bestScore) {
        bestScore = score;
        bestDistribution = {
          columnProperties: columnProps,
          rowProperties: rowProps,
          totalCols,
          totalRows,
          aspectRatio,
          score,
        };
      }
    }

  

    return bestDistribution;
  }

  const optimalDistribution = getOptimalDistribution(layoutDirection);
  const columnProperties = optimalDistribution.columnProperties;
  const rowProperties = optimalDistribution.rowProperties;

  // Calculate uniform cell size
  const maxInstanceWidth = Math.max(...instances.map((i) => i.width));
  const maxInstanceHeight = Math.max(...instances.map((i) => i.height));
  const cellSize = Math.max(maxInstanceWidth, maxInstanceHeight) + spacing;

  // Text helper
  function createText(
  content: string,
  fontSize: number = 12,
  isBold: boolean = false,
  color: RGB = { r: 0.2, g: 0.2, b: 0.2 } // Keep default, but allow override
): TextNode {
  const text = figma.createText();
  text.characters = content;
  text.fontSize = fontSize;
  text.fontName = { family: "Inter", style: isBold ? "Bold" : "Regular" };
  text.fills = [{ type: "SOLID", color }];
  text.textAutoResize = "WIDTH_AND_HEIGHT";
  return text;
}

  // Generate all column combinations
  function generateCombinations(
    properties: string[]
  ): Record<string, string>[] {
    if (properties.length === 0) return [{}];

    const [first, ...rest] = properties;
    const restCombinations = generateCombinations(rest);
    const result: Record<string, string>[] = [];

    propertyGroups[first].forEach((value) => {
      restCombinations.forEach((combo) => {
        result.push({ [first]: value, ...combo });
      });
    });

    return result;
  }

  const columnCombinations = generateCombinations(columnProperties);
  const rowCombinations = generateCombinations(rowProperties);

  const cols = columnCombinations.length;
  const rows = Math.max(1, rowCombinations.length);

  // Calculate total dimensions
  const labelWidth = 150; // Increased for multiple properties
  const headerHeight = 100; // Increased for multiple properties
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  // ... [previous setup code until foundation creation] ...

  // Calculate dynamic header height based on property levels
  const dynamicHeaderHeight = columnProperties.length * 40 + 20;
  const dynamicLabelWidth = rowProperties.length * 60 + 60; // Dynamic width for row spans

  // Update total dimensions
  const totalWidth = dynamicLabelWidth + gridWidth + 48;
  const totalHeight = dynamicHeaderHeight + gridHeight + 48;

  // Create main container
const mainContainer = figma.createFrame();
  mainContainer.name = `${singleComponent?.name || componentSet?.name || "Component"} - All Variants`;  // ✅ NEW
  mainContainer.fills = [
    { type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98 } },
  ];
  mainContainer.cornerRadius = 8;
  mainContainer.resize(totalWidth, totalHeight);

  // STEP 1: Create foundation with spanning headers (BOTH rows and columns)
  const foundationContainer = figma.createFrame();
  foundationContainer.name = "🔒 Foundation (Locked)";
  foundationContainer.x = 24;
  foundationContainer.y = 24;
  foundationContainer.resize(totalWidth - 48, totalHeight - 48);
  foundationContainer.fills = [];
  foundationContainer.locked = true;

  // 🎯 CREATE SPANNING COLUMN HEADER BOXES
  function createSpanningColumnHeaders() {
    columnProperties.forEach((prop, propIndex) => {
      const yLevel = propIndex * 40;

      // Find spans for this property across columns
      const spans: any[] = [];
      let currentSpan: any = null;

      columnCombinations.forEach((colCombo, colIndex) => {
        const value = colCombo[prop];

        if (!currentSpan || currentSpan.value !== value) {
          // Start new span
          if (currentSpan) spans.push(currentSpan);
          currentSpan = {
            value,
            startCol: colIndex,
            endCol: colIndex,
            property: prop,
          };
        } else {
          // Extend current span
          currentSpan.endCol = colIndex;
        }
      });

      if (currentSpan) spans.push(currentSpan);

      // Create boxes for each span
      spans.forEach((span) => {
        const startX = dynamicLabelWidth + span.startCol * cellSize;
        const width = (span.endCol - span.startCol + 1) * cellSize;

        const spanBox = figma.createFrame();
        spanBox.name = `Col ${prop}: ${span.value}`;
spanBox.x = startX ;
spanBox.y = yLevel;
      
        spanBox.resize(width, 35);
        spanBox.fills = [
          {
            type: "SOLID",
            color: currentTheme.secondary,
          },
        ];
        spanBox.cornerRadius = 6;
        spanBox.strokeAlign = "INSIDE";
        spanBox.strokes = [
          { type: "SOLID", color: currentTheme.stroke },
        ];
        spanBox.strokeWeight = 0.5;

        foundationContainer.appendChild(spanBox);
      });
    });
  }

  // 🎯 CREATE SPANNING ROW HEADER BOXES
  function createSpanningRowHeaders() {
    rowProperties.forEach((prop, propIndex) => {
      const xLevel = propIndex * 60; // Stack row properties horizontally

      // Find spans for this property across rows
      const spans: any[] = [];
      let currentSpan: any = null;

      rowCombinations.forEach((rowCombo, rowIndex) => {
        const value = rowCombo[prop];

        if (!currentSpan || currentSpan.value !== value) {
          // Start new span
          if (currentSpan) spans.push(currentSpan);
          currentSpan = {
            value,
            startRow: rowIndex,
            endRow: rowIndex,
            property: prop,
          };
        } else {
          // Extend current span
          currentSpan.endRow = rowIndex;
        }
      });

      if (currentSpan) spans.push(currentSpan);

      // Create boxes for each span
      spans.forEach((span) => {
        const startY = dynamicHeaderHeight + span.startRow * cellSize;
        const height = (span.endRow - span.startRow + 1) * cellSize;

        const spanBox = figma.createFrame();
        spanBox.name = `Row ${prop}: ${span.value}`;
spanBox.x = xLevel ;
spanBox.y = startY ;
        spanBox.resize(55, height);
        spanBox.fills = [
          {
            type: "SOLID",
            color: currentTheme.secondary
          },
        ];
        spanBox.cornerRadius = 6;
        spanBox.strokeAlign = "INSIDE";
        spanBox.strokes = [
          { type: "SOLID", color: currentTheme.stroke },
        ];
        spanBox.strokeWeight = 0.5;

        foundationContainer.appendChild(spanBox);
      });
    });
  }

  createSpanningColumnHeaders();
  createSpanningRowHeaders();

  // Create grid container
  const gridContainer = figma.createFrame();
  gridContainer.name = "Grid Container";
  gridContainer.x = dynamicLabelWidth;
  gridContainer.y = dynamicHeaderHeight;
  gridContainer.resize(gridWidth, gridHeight);
  gridContainer.fills = [];
  gridContainer.strokeAlign = "INSIDE";
  gridContainer.cornerRadius = 8;

  // ✅ Create grid cells with offset positioning to prevent border overlap
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const cell = figma.createFrame();
    cell.name = `Cell ${row}-${col}`;
    
      cell.x = dynamicLabelWidth + col * cellSize;
      cell.y = dynamicHeaderHeight + row * cellSize;
    
    cell.resize(cellSize, cellSize);
    cell.fills = [
      { type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.8 },
    ];
    cell.strokeAlign = "INSIDE";
    cell.strokes = [{ type: "SOLID", color: currentTheme.accent }];
    cell.strokeWeight = 1;
    cell.dashPattern = [8, 4];
    cell.cornerRadius = 4;

    foundationContainer.appendChild(cell);
  }
}

  foundationContainer.appendChild(gridContainer);
  mainContainer.appendChild(foundationContainer);

  // STEP 2: Instances layer (update X and Y positions)
  const instancesLayer = figma.createFrame();
  instancesLayer.name = "✏️ Instances (Editable)";
  instancesLayer.x = 24;
  instancesLayer.y = 24;
  instancesLayer.resize(totalWidth - 48, totalHeight - 48);
  instancesLayer.fills = [];
  instancesLayer.locked = false;

  // Position instances (update both X and Y calculations)
  combinations.forEach((combination, index) => {
    const colIndex = columnCombinations.findIndex((colCombo) =>
      columnProperties.every((prop) => colCombo[prop] === combination[prop])
    );
    const rowIndex = rowCombinations.findIndex((rowCombo) =>
      rowProperties.every((prop) => rowCombo[prop] === combination[prop])
    );

    if (colIndex >= 0 && (rowIndex >= 0 || rowProperties.length === 0)) {
      const instance = instances[index];
      if (instance) {
        const cellCenterX =
          dynamicLabelWidth + colIndex * cellSize + cellSize / 2;
        const cellCenterY =
          dynamicHeaderHeight + (rowIndex || 0) * cellSize + cellSize / 2;

        instance.x = cellCenterX - instance.width / 2;
        instance.y = cellCenterY - instance.height / 2;

        instancesLayer.appendChild(instance);
      }
    }
  });

  mainContainer.appendChild(instancesLayer);

  // STEP 3: Spanning text labels (BOTH columns and rows)
  const textLabelsLayer = figma.createFrame();
  textLabelsLayer.name = "📝 Text Labels (Top Layer)";
  textLabelsLayer.x = 24;
  textLabelsLayer.y = 24;
  textLabelsLayer.resize(totalWidth - 48, totalHeight - 48);
  textLabelsLayer.fills = [];
  textLabelsLayer.locked = true;

  // 📝 CREATE SPANNING COLUMN TEXT LABELS
  columnProperties.forEach((prop, propIndex) => {
    const yLevel = propIndex * 40;

    let currentSpan: any = null;
    const spans: any[] = [];

    columnCombinations.forEach((colCombo, colIndex) => {
      const value = colCombo[prop];

      if (!currentSpan || currentSpan.value !== value) {
        if (currentSpan) spans.push(currentSpan);
        currentSpan = { value, startCol: colIndex, endCol: colIndex };
      } else {
        currentSpan.endCol = colIndex;
      }
    });
    if (currentSpan) spans.push(currentSpan);

    // Create labels for each column span
    spans.forEach((span) => {
      const startX = dynamicLabelWidth + span.startCol * cellSize;
      const width = (span.endCol - span.startCol + 1) * cellSize;
      const centerX = startX + width / 2;

      // Property name (small, gray)
      const propLabel = createText(cleanPropertyName(prop), 9, false, { r: 0.6, g: 0.6, b: 0.6 });
      propLabel.x = centerX - propLabel.width / 2;
      propLabel.y = yLevel + 5;
      textLabelsLayer.appendChild(propLabel);

      // Property value (bold, colored)
     const valueLabel = createText(span.value, 11, true, currentTheme.primary);
      valueLabel.x = centerX - valueLabel.width / 2;
      valueLabel.y = yLevel + 18;
      textLabelsLayer.appendChild(valueLabel);
    });
  });

  // 📝 CREATE SPANNING ROW TEXT LABELS
  rowProperties.forEach((prop, propIndex) => {
    const xLevel = propIndex * 60;

    let currentSpan: any = null;
    const spans: any[] = [];

    rowCombinations.forEach((rowCombo, rowIndex) => {
      const value = rowCombo[prop];

      if (!currentSpan || currentSpan.value !== value) {
        if (currentSpan) spans.push(currentSpan);
        currentSpan = { value, startRow: rowIndex, endRow: rowIndex };
      } else {
        currentSpan.endRow = rowIndex;
      }
    });
    if (currentSpan) spans.push(currentSpan);

    // Create labels for each row span
    spans.forEach((span) => {
      const startY = dynamicHeaderHeight + span.startRow * cellSize;
      const height = (span.endRow - span.startRow + 1) * cellSize;
      const centerY = startY + height / 2;

      // Property name (small, gray)
      const propLabel = createText(cleanPropertyName(prop), 8, false, { r: 0.6, g: 0.6, b: 0.6 });
      propLabel.x = xLevel + 27 - propLabel.width / 2;
      propLabel.y = centerY - 10;
      textLabelsLayer.appendChild(propLabel);

      // Property value (bold, colored)
     const valueLabel = createText(span.value, 11, true, currentTheme.primary);
      valueLabel.x = xLevel + 27 - valueLabel.width / 2;
      valueLabel.y = centerY + 2;
      textLabelsLayer.appendChild(valueLabel);
    });
  });

  mainContainer.appendChild(textLabelsLayer);

  // Position and show
// ✅ NEW - Smart positioning next to selected component
  const selectedNode = singleComponent || (componentSet?.children[0] as ComponentNode);
  
  if (selectedNode) {
    // Place table to the right of the selected component with 100px spacing
    mainContainer.x = selectedNode.x + selectedNode.width + 100;
    mainContainer.y = selectedNode.y;
    
    // If table would go off-screen to the right, place it to the left instead
    const viewportBounds = figma.viewport.bounds;
    const tableRightEdge = mainContainer.x + mainContainer.width;
    
    if (tableRightEdge > viewportBounds.x + viewportBounds.width) {
      // Place to the left instead
      mainContainer.x = selectedNode.x - mainContainer.width - 100;
      
      // If still off-screen, place below
      if (mainContainer.x < viewportBounds.x) {
        mainContainer.x = selectedNode.x;
        mainContainer.y = selectedNode.y + selectedNode.height + 100;
      }
    }
  } else {
    // Fallback to center of viewport
    const viewportCenter = figma.viewport.center;
    mainContainer.x = viewportCenter.x - mainContainer.width / 2;
    mainContainer.y = viewportCenter.y - mainContainer.height / 2;
  }
  
  figma.viewport.scrollAndZoomIntoView([mainContainer]);

  return mainContainer;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate-table") {
  const { componentId, spacing, enabledProperties, theme, generatePropertyTable } = msg;

    // CHECK PAYMENT STATUS AND USAGE COUNT - ADD THIS BLOCK
    const usageCount = (await figma.clientStorage.getAsync("usage-count")) || 0;

    // If user has reached free limit and hasn't paid, show checkout
    if (
      usageCount >= FREE_USAGE_LIMIT &&
      figma.payments.status.type === "UNPAID"
    ) {
      figma.notify(
        `You've reached the free limit of ${FREE_USAGE_LIMIT} generations. Please upgrade to continue.`
      );

      // Initiate checkout process
      await figma.payments.initiateCheckoutAsync({
        interstitial: "TRIAL_ENDED",
      });

      // Check if user completed payment
      if (figma.payments.status.type === "UNPAID") {
        figma.notify("Payment required to continue using this feature.");
        return;
      }
    }
    // END PAYMENT CHECK

    // ✅ NEW - Handle both component types
    const node = await figma.getNodeByIdAsync(componentId);
    
    if (node && (node.type === "COMPONENT_SET" || node.type === "COMPONENT")) {
      const allProperties: ComponentProperty[] = [];

      if (node.type === "COMPONENT_SET") {
        const componentSet = node as ComponentSetNode;
        
        // Extract component set properties
        for (const [propertyName, property] of Object.entries(
          componentSet.componentPropertyDefinitions
        )) {
          if (property.type === "VARIANT") {
            allProperties.push({
              name: propertyName,
              type: "VARIANT",
              values: property.variantOptions || [],
            });
          } else if (property.type === "BOOLEAN") {
            allProperties.push({
              name: propertyName,
              type: "BOOLEAN",
              values: ["true", "false"],
            });
          }
        }

        // Add exposed instance properties
        const exposedProperties = await getExposedInstanceProperties(componentSet);
        allProperties.push(...exposedProperties);
      } else {
        // For single components, only get exposed instance properties
        const component = node as ComponentNode;
        const exposedProperties = await getExposedInstanceProperties(component);
        allProperties.push(...exposedProperties);
      }

      // Filter to only enabled properties
      const properties = allProperties.filter((prop) =>
        enabledProperties.includes(prop.name)
      );

      const combinations = generateCombinations(properties);
     await createInstancesTable(componentId, combinations, spacing, msg.layoutDirection, theme); // Pass theme

  if (generatePropertyTable) {
  const componentName = node.name;
  
  // Find the instances table that was just created
  let instancesTableFrame: FrameNode | null = null;
  const recentNodes = figma.currentPage.children;
  for (let i = recentNodes.length - 1; i >= 0; i--) {
    const node = recentNodes[i];
    if (node.type === "FRAME" && node.name.includes("All Variants")) {
      instancesTableFrame = node as FrameNode;
      break;
    }
  }
  
  // Pass instances table position to property table
  const instancesTableInfo = instancesTableFrame ? {
    x: instancesTableFrame.x,
    y: instancesTableFrame.y,
    width: instancesTableFrame.width,
    height: instancesTableFrame.height
  } : null;
  
  await createPropertyDocumentationTable(componentName, allProperties, theme, instancesTableInfo);
}
      // INCREMENT USAGE COUNT AND NOTIFY - ADD THIS BLOCK
      if (figma.payments.status.type === "UNPAID") {
        const newCount = usageCount + 1;
        await figma.clientStorage.setAsync("usage-count", newCount);

        // Notify user about remaining free usages
        const remaining = Math.max(0, FREE_USAGE_LIMIT - newCount);
        if (remaining > 0) {
          figma.notify(
            `Generated component table! You have ${remaining} free generations remaining.`
          );
        } else {
          figma.notify(
            `Generated component table! This was your last free generation.`
          );
        }
      } else {
        figma.notify(`Generated component table!`);
      }
 figma.ui.postMessage({
      type: "table-generation-complete"
    });
      // Send usage status to UI
      figma.ui.postMessage({
        type: "update-usage",
        usageCount:
          figma.payments.status.type === "UNPAID"
            ? usageCount + 1
            : "unlimited",
        isPaid: figma.payments.status.type === "PAID",
      });
      // END USAGE COUNT UPDATE
    }
  } else if (msg.type === "generate-property-table") {
    await handlePropertyTableMessage(msg);
  }

  // ADD THESE NEW MESSAGE HANDLERS
  else if (msg.type === "check-payment-status") {
    const usageCount = (await figma.clientStorage.getAsync("usage-count")) || 0;
    figma.ui.postMessage({
      type: "update-usage",
      usageCount:
        figma.payments.status.type === "UNPAID" ? usageCount : "unlimited",
      isPaid: figma.payments.status.type === "PAID",
    });
  } else if (msg.type === "initiate-payment") {
    await figma.payments.initiateCheckoutAsync({
      interstitial: "PAID_FEATURE",
    });

    const usageCount = (await figma.clientStorage.getAsync("usage-count")) || 0;
    figma.ui.postMessage({
      type: "update-usage",
      usageCount:
        figma.payments.status.type === "UNPAID" ? usageCount : "unlimited",
      isPaid: figma.payments.status.type === "PAID",
    });
  } else if (msg.type === "toggle-dev-payment-status") {
    toggleDevPaymentStatus();

    const usageCount = (await figma.clientStorage.getAsync("usage-count")) || 0;
    figma.ui.postMessage({
      type: "update-usage",
      usageCount:
        figma.payments.status.type === "UNPAID" ? usageCount : "unlimited",
      isPaid: figma.payments.status.type === "PAID",
    });
  } else if (msg.type === "reset-usage-count") {
    resetUsageCount();
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
