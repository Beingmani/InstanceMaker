import React from 'react';
import { Table, Card, Tag, Button, Space } from 'antd';
import { TableOutlined } from '@ant-design/icons';

interface PropertyTableProps {
  selectedComponent: any;
  onGeneratePropertyTable: () => void;
  isGenerating: boolean;
  isPaid: boolean;
  usageCount: number | "unlimited";
  FREE_USAGE_LIMIT: number;
}

const PropertyTable: React.FC<PropertyTableProps> = ({
  selectedComponent,
  onGeneratePropertyTable,
  isGenerating,
  isPaid,
  usageCount,
  FREE_USAGE_LIMIT
}) => {
  if (!selectedComponent) {
    return (
      <Card title="Property Documentation Table" style={{ marginTop: "16px" }}>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Select a component to generate its property documentation table</p>
        </div>
      </Card>
    );
  }

  // Prepare data for the table
  const tableData = selectedComponent.properties.map((property: any, index: number) => ({
    key: index,
    propName: property.name,
    description: `Controls the ${property.name} behavior of the component`,
    type: property.type === 'EXPOSED_INSTANCE' ? 'Nested Instance' : property.type.toLowerCase(),
    propValues: property.values,
    defaultValue: property.values[0] || 'N/A'
  }));

  const columns = [
    {
      title: 'Prop Name',
      dataIndex: 'propName',
      key: 'propName',
      width: '20%',
      render: (text: string) => {
        const cleanName = text.split('#')[0];
        return (
          <span>
            <strong>{cleanName}</strong>
            {text !== cleanName && <span style={{ color: '#888', fontSize: '12px' }}> *</span>}
          </span>
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      render: (text: string, record: any) => {
        const descriptions: { [key: string]: string } = {
          'VARIANT': `Controls the visual variant of the ${record.propName} property`,
          'BOOLEAN': `Toggles the ${record.propName} state on or off`,
          'string': `Sets the text content for ${record.propName}`,
          'Nested Instance': `Controls the nested component instance for ${record.propName}`
        };
        return descriptions[record.type] || text;
      }
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type: string) => {
        const color = type === 'variant' ? 'blue' : 
                    type === 'boolean' ? 'green' : 
                    type === 'Nested Instance' ? 'purple' : 'default';
        return <Tag color={color}>{type}</Tag>;
      }
    },
    {
      title: 'Prop Values',
      dataIndex: 'propValues',
      key: 'propValues',
      width: '25%',
      render: (values: string[]) => (
        <div>
          {values.map((value, idx) => (
            <Tag key={idx} style={{ marginBottom: '2px' }}>{value}</Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Default',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: '10%',
      render: (value: string) => <code>{value}</code>
    }
  ];

  const canGenerate = selectedComponent && 
    selectedComponent.properties.length > 0 && 
    (isPaid || (typeof usageCount === "number" && usageCount < FREE_USAGE_LIMIT));

  return (
    <Card 
      title="Property Documentation Table" 
      style={{ marginTop: "16px" }}
      extra={
        <Button
          type="primary"
          icon={<TableOutlined />}
          onClick={onGeneratePropertyTable}
          loading={isGenerating}
          disabled={!canGenerate}
          size="small"
        >
          {isGenerating ? 'Generating...' : 'Generate Table'}
        </Button>
      }
    >
      {selectedComponent.properties.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>This component has no configurable properties to document</p>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
          style={{ fontSize: '12px' }}
        />
      )}
      
      {selectedComponent.properties.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#666' }}>
          <p>* Properties with # contain nested path information</p>
          <p>Found {selectedComponent.properties.length} total properties</p>
        </div>
      )}
    </Card>
  );
};

export default PropertyTable;