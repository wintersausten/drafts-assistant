export function isValidISOString(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export function updateDataParams(params, updateMap) {
  let updates = [];
  
  params.ExpressionAttributeNames['#data'] = 'data';
  
  Object.entries(updateMap).forEach(([key, value]) => {
    const attributeKeyPlaceholder = `#${key}`;
    const attributeValuePlaceholder = `:${key}`;
    
    updates.push(`#data.${attributeKeyPlaceholder} = ${attributeValuePlaceholder}`);
    
    params.ExpressionAttributeNames[attributeKeyPlaceholder] = key;
    params.ExpressionAttributeValues[attributeValuePlaceholder] = value;
  });
  
  params.UpdateExpression += " " + updates.join(", ");
}

