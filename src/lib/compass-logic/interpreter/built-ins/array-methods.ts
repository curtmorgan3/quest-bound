const arrayMethodLists = ['count', 'first', 'last', 'random', 'filterEmpty'];

export function isBuiltInArrayMethod(method: any): boolean {
  if (typeof method !== 'string') return false;
  return arrayMethodLists.includes(method);
}

function arrayCount(arr: any): number {
  return arr.length;
}

function arrayFirst(arr: any): any {
  return arr[0];
}

function arrayLast(arr: any): any {
  return arr[arr.length - 1];
}

function arrayRandom(arr: any): any {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

function arrayFilterEmpty(arr: any): any {
  return arr.filter(
    (val: any) => val !== '' && val !== undefined && val !== null && val !== 'null',
  );
}

export function registerArrayMethod(method: any, arr: any) {
  if (typeof method !== 'string') return;

  switch (method) {
    case 'count':
      return arrayCount(arr);
    case 'first':
      return arrayFirst(arr);
    case 'last':
      return arrayLast(arr);
    case 'filterEmpty':
      return arrayFilterEmpty(arr);
    case 'random':
      return arrayRandom(arr);
  }
}
