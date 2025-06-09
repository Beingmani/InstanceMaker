// propertyTableController.ts
// This file handles the property table generation functionality

interface ComponentProperty {
  name: string;
  type: "VARIANT" | "BOOLEAN";
  values: string[];
}

// propertyTableController.ts - PROPER AUTO LAYOUT WITH CELL BORDERS

export async function createPropertyDocumentationTable(
  componentName: string,
  properties: ComponentProperty[],
  theme?: any,
  instancesTableInfo?: { x: number; y: number; width: number; height: number } | null
): Promise<FrameNode> {

    const filteredProperties = properties.filter(prop => 
    prop.type === "VARIANT" || prop.type === "BOOLEAN"
  );
  
    
  const currentTheme = theme || {
    primary: { r: 0.4, g: 0.2, b: 0.8 },
    secondary: { r: 0.94, g: 0.94, b: 0.98 },
    stroke: { r: 0.85, g: 0.85, b: 0.9 },
    accent: { r: 0.7, g: 0.4, b: 1 }
  };

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

  // Column configurations
  const columns = [
    { title: "Prop Name", width: 120 },
    { title: "Description", width: 280 },
    { title: "Type", width: 80 },
    { title: "Prop Values", width: 200 },
    { title: "Default", width: 100 }
  ];

  // Create main container with AUTO LAYOUT
  const mainContainer = figma.createFrame();
  mainContainer.name = `${componentName} - Property Documentation`;
  mainContainer.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  mainContainer.cornerRadius = 4;
  
  // 🔥 ENABLE AUTO LAYOUT on main container
  mainContainer.layoutMode = "VERTICAL";
  mainContainer.paddingTop = 20;
  mainContainer.paddingBottom = 20;
  mainContainer.paddingLeft = 20;
  mainContainer.paddingRight = 20;
  mainContainer.itemSpacing = 20;
  mainContainer.primaryAxisSizingMode = "AUTO";
  mainContainer.counterAxisSizingMode = "AUTO";
  
  // Add shadow
  mainContainer.effects = [{
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 4 },
    radius: 16,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  }];

  // // Create title
  // const title = await createPropertyTableText(
  //   `${componentName} Properties`,
  //   20,
  //   true,
  //   currentTheme.primary
  // );
  // title.textAutoResize = "WIDTH_AND_HEIGHT";
  // mainContainer.appendChild(title);

  // Create table container with AUTO LAYOUT
  const tableContainer = figma.createFrame();
  tableContainer.name = "Property Table";
  tableContainer.fills = [];
  tableContainer.cornerRadius = 8;
  tableContainer.clipsContent = true;
  
  // 🔥 ENABLE AUTO LAYOUT on table container
  tableContainer.layoutMode = "VERTICAL";
  tableContainer.itemSpacing = 0;
  tableContainer.primaryAxisSizingMode = "AUTO";
  tableContainer.counterAxisSizingMode = "AUTO";

// CREATE HEADER ROW with AUTO LAYOUT
const headerRow = figma.createFrame();
headerRow.name = "Header Row";
headerRow.fills = [];

// 🔥 ENABLE AUTO LAYOUT on header row
headerRow.layoutMode = "HORIZONTAL";
headerRow.itemSpacing = 0;
headerRow.primaryAxisSizingMode = "AUTO";
headerRow.counterAxisSizingMode = "AUTO";

// 🔥 NEW: Store header cells and track max height
const headerCells = [];
let maxHeaderHeight = 0;

// FIRST PASS: Create header cells with natural sizing
for (let colIndex = 0; colIndex < columns.length; colIndex++) {
  const col = columns[colIndex];
  
  const headerCell = figma.createFrame();
  headerCell.name = `Header ${col.title}`;
  headerCell.fills = [{ type: "SOLID", color: currentTheme.secondary }];
  
  // 🔥 ADD BORDER USING STROKES (no separate elements!)
  headerCell.strokes = [{ type: "SOLID", color: currentTheme.stroke }];
  headerCell.strokeWeight = 0.5;
  headerCell.strokeAlign = "INSIDE";
  
  // 🔥 ENABLE AUTO LAYOUT on header cell
  headerCell.layoutMode = "VERTICAL";
  headerCell.paddingTop = 16;
  headerCell.paddingBottom = 16;
  headerCell.paddingLeft = 12;
  headerCell.paddingRight = 12;
  headerCell.primaryAxisSizingMode = "AUTO"; // Changed from "FIXED"
  headerCell.counterAxisSizingMode = "AUTO"; // Let it size naturally first
  headerCell.primaryAxisAlignItems = "CENTER";
  headerCell.counterAxisAlignItems = "CENTER";

  // 🔥 REMOVED: headerCell.resize(col.width, 60); - Don't set fixed height yet

  const headerText = await createPropertyTableText(
    col.title,
    12,
    true,
    { r: 0.3, g: 0.3, b: 0.3 }
  );
  headerText.textAutoResize = "WIDTH_AND_HEIGHT";
  headerCell.appendChild(headerText);
  
  // 🔥 NEW: Set width and track height
  headerCell.resize(col.width, headerCell.height);
  maxHeaderHeight = Math.max(maxHeaderHeight, headerCell.height);
  headerCells.push(headerCell);
  
  headerRow.appendChild(headerCell);
}

// 🔥 NEW: SECOND PASS - Set all header cells to the same height
headerCells.forEach(cell => {
  cell.counterAxisSizingMode = "FIXED";
  cell.resize(cell.width, maxHeaderHeight);
});

tableContainer.appendChild(headerRow);

  // CREATE DATA ROWS with AUTO LAYOUT
 // CREATE DATA ROWS with AUTO LAYOUT
for (let rowIndex = 0; rowIndex < filteredProperties.length; rowIndex++) {
  const property = filteredProperties[rowIndex];
  
  // Create row container with AUTO LAYOUT
  const dataRow = figma.createFrame();
  dataRow.name = `Data Row ${rowIndex}`;
  dataRow.fills = [];
  
  // 🔥 ENABLE AUTO LAYOUT on data row
  dataRow.layoutMode = "HORIZONTAL";
  dataRow.itemSpacing = 0;
  dataRow.primaryAxisSizingMode = "AUTO";
  dataRow.counterAxisSizingMode = "AUTO";

  // Prepare row data
  const cleanPropName = property.name.split('#')[0];
  const rowData = [
    cleanPropName,
    getPropertyDescription(property),
    getPropertyTypeDisplay(property.type),
    property.values.map(value => `• ${value}`).join('\n'),
    property.values[0] || 'N/A'
  ];

  // 🔥 NEW: Store cells and track max height
  const rowCells = [];
  let maxCellHeight = 0;

  // FIRST PASS: Create cells for this row with AUTO LAYOUT
  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const col = columns[colIndex];
    const cellData = rowData[colIndex];
    
    const cell = figma.createFrame();
    cell.name = `Cell ${rowIndex}-${colIndex}`;
    cell.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    
    // 🔥 ADD BORDER USING STROKES (no separate elements!)
    cell.strokes = [{ type: "SOLID", color: currentTheme.stroke }];
    cell.strokeWeight = 0.5;
    cell.strokeAlign = "INSIDE";
    
    // 🔥 ENABLE AUTO LAYOUT on cell
    cell.layoutMode = "VERTICAL";
    cell.paddingTop = 12;
    cell.paddingBottom = 12;
    cell.paddingLeft = 12;
    cell.paddingRight = 12;
    cell.primaryAxisSizingMode = "AUTO";
    cell.counterAxisSizingMode = "AUTO"; // Start with AUTO to get natural height
    cell.primaryAxisAlignItems = "CENTER";
    cell.counterAxisAlignItems = "CENTER";

    // Special formatting for different columns
    let textColor = { r: 0.2, g: 0.2, b: 0.2 };
    let isBold = false;
    let fontSize = 11;

    if (colIndex === 0) { // Prop Name column
      isBold = true;
      textColor = currentTheme.primary;
      fontSize = 12;
    } else if (colIndex === 2) { // Type column
      textColor = { r: 0.4, g: 0.4, b: 0.8 };
      fontSize = 10;
      isBold = true;
    } else if (colIndex === 4) { // Default column
      fontSize = 10;
      textColor = { r: 0.6, g: 0.6, b: 0.6 };
    }

    const cellText = await createPropertyTableText(
      cellData,
      fontSize,
      isBold,
      textColor
    );
    
    // Handle text sizing based on column
    cellText.textAutoResize = "HEIGHT";
    cellText.resize(col.width - 24, cellText.height);

    cell.appendChild(cellText);
    
    // 🔥 NEW: Set cell width and track height
    cell.resize(col.width, cell.height);
    maxCellHeight = Math.max(maxCellHeight, cell.height);
    rowCells.push(cell);
    
    dataRow.appendChild(cell);
  }

  // 🔥 NEW: SECOND PASS - Set all cells to the same height
  rowCells.forEach(cell => {
    cell.counterAxisSizingMode = "FIXED";
    cell.resize(cell.width, maxCellHeight);
  });

  tableContainer.appendChild(dataRow);
}

  mainContainer.appendChild(tableContainer);

  // Smart positioning
 // Smart positioning
  try {
    if (instancesTableInfo) {
      // Position next to instances table
      mainContainer.x = instancesTableInfo.x + instancesTableInfo.width + 50;
      mainContainer.y = instancesTableInfo.y;
      
      // Check viewport bounds and adjust if needed
      const viewportBounds = figma.viewport.bounds;
      const tableRightEdge = mainContainer.x + mainContainer.width;
      
      if (tableRightEdge > viewportBounds.x + viewportBounds.width) {
        mainContainer.x = instancesTableInfo.x - mainContainer.width - 50;
        
        if (mainContainer.x < viewportBounds.x) {
          mainContainer.x = instancesTableInfo.x;
          mainContainer.y = instancesTableInfo.y + instancesTableInfo.height + 50;
        }
      }
    } else {
      // Original positioning logic for when no instances table exists
      const selection = figma.currentPage.selection;
      if (selection.length > 0) {
        const selectedNode = selection[0];
        mainContainer.x = selectedNode.x + selectedNode.width + 100;
        mainContainer.y = selectedNode.y;
        
        const viewportBounds = figma.viewport.bounds;
        const tableRightEdge = mainContainer.x + mainContainer.width;
        
        if (tableRightEdge > viewportBounds.x + viewportBounds.width) {
          mainContainer.x = selectedNode.x - mainContainer.width - 100;
          
          if (mainContainer.x < viewportBounds.x) {
            mainContainer.x = selectedNode.x;
            mainContainer.y = selectedNode.y + selectedNode.height + 100;
          }
        }
      } else {
        const viewportCenter = figma.viewport.center;
        mainContainer.x = viewportCenter.x - mainContainer.width / 2;
        mainContainer.y = viewportCenter.y - mainContainer.height / 2;
      }
    }
  } catch {
    const viewportCenter = figma.viewport.center;
    mainContainer.x = viewportCenter.x - mainContainer.width / 2;
    mainContainer.y = viewportCenter.y - mainContainer.height / 2;
  }

  figma.viewport.scrollAndZoomIntoView([mainContainer]);
  return mainContainer;
}

// Helper functions remain the same
async function createPropertyTableText(
  content: string,
  fontSize: number = 10,
  isBold: boolean = false,
  color: RGB = { r: 0.2, g: 0.2, b: 0.2 }
): Promise<TextNode> {
  const text = figma.createText();
  text.characters = content;
  text.fontSize = fontSize;
  
  try {
    text.fontName = { family: "Inter", style: isBold ? "Bold" : "Regular" };
  } catch {
    try {
      text.fontName = { family: "Roboto", style: isBold ? "Bold" : "Regular" };
    } catch {
      text.fontName = { family: "Arial", style: isBold ? "Bold" : "Regular" };
    }
  }
  
  text.fills = [{ type: "SOLID", color }];
  return text;
}

function getPropertyDescription(property: ComponentProperty): string {
  const cleanName = property.name.split('#')[0];
  
  switch (property.type) {
    case 'VARIANT':
      return `Shows the intent of the component`;
    case 'BOOLEAN':
      return `If true, will remove the border & border-radius from the container`;
    default:
      return `Controls the ${cleanName} behavior of the component`;
  }
}

function getPropertyTypeDisplay(type: string): string {
  switch (type) {
    case 'VARIANT':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    case 'EXPOSED_INSTANCE':
      return 'string';
    default:
      return 'string';
  }
}

export async function handlePropertyTableMessage(msg: any): Promise<void> {
  if (msg.type === "generate-property-table") {
    const { componentName, properties, theme } = msg;

    try {
      await createPropertyDocumentationTable(componentName, properties, theme);
      figma.notify("Property documentation table generated successfully!");
      
      figma.ui.postMessage({
        type: "property-table-generation-complete"
      });
    } catch (error) {
      console.error("Error generating property table:", error);
      figma.notify("Error generating property table");
      
      figma.ui.postMessage({
        type: "property-table-generation-complete"
      });
    }
  }
}