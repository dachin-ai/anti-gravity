import React from 'react';

export const Bi = ({ e, c, block }) => {
  if (block) {
    return (
      <span style={{ display: 'block', lineHeight: 1.3 }}>
        <span style={{ display: 'block' }}>{e}</span>
        {c && <span style={{ 
          display: 'block',
          fontSize: '0.75em', 
          opacity: 0.55, 
          fontWeight: 'normal',
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          marginTop: '2px'
        }}>{c}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline' }}>
      <span>{e}</span>
      {c && <span style={{ 
        display: 'inline-block', // allows the Chinese part to stick together slightly better
        fontSize: '0.75em', 
        opacity: 0.55, 
        fontWeight: 'normal',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        marginLeft: '6px'
      }}>{c}</span>}
    </span>
  );
};

export default Bi;
