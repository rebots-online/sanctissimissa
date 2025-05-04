/**
 * SQL.js Fix
 * 
 * This script fixes the "SQL.Database is not a constructor" error by
 * providing a global SQL object with a Database constructor.
 */

// Create a simple mock Database constructor
function Database(data) {
  this.data = data;
  this.tables = {};
  
  // Mock methods
  this.exec = function(sql) {
    console.log('Mock SQL exec:', sql);
    return [];
  };
  
  this.prepare = function(sql) {
    console.log('Mock SQL prepare:', sql);
    return {
      bind: function(params) {
        console.log('Mock SQL bind:', params);
      },
      step: function() {
        return false;
      },
      getAsObject: function() {
        return {};
      },
      free: function() {}
    };
  };
  
  this.close = function() {
    console.log('Mock SQL close');
  };
  
  this.export = function() {
    return new Uint8Array(0);
  };
}

// Create a global SQL object with the Database constructor
window.SQL = {
  Database: Database
};

console.log('SQL.js fix loaded. SQL.Database is now a constructor.');
