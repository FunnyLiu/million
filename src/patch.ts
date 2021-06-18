import { OLD_VNODE_FIELD } from './constants';
import { createElement } from './createElement';
import { VElement, VFlags, VNode, VProps } from './structs';

/**
 * Diffs two VNode props and modifies the DOM node based on the necessary changes
 * @param {HTMLElement} el - Target element to be modified
 * @param {VProps} oldProps - Old VNode props
 * @param {VProps} newProps - New VNode props
 */
/* istanbul ignore next */
export const patchProps = (el: HTMLElement, oldProps: VProps, newProps: VProps): void => {
  const cache = [];
  //挨个替换属性
  for (const oldPropName of Object.keys(oldProps)) {
    const newPropValue = newProps[oldPropName];
    if (newPropValue) {
      el[oldPropName] = newPropValue;
      cache.push(oldPropName);
    } else {
      el.removeAttribute(oldPropName);
      delete el[oldPropName];
    }
  }

  for (const newPropName of Object.keys(newProps)) {
    if (!cache.includes(newPropName)) {
      el[newPropName] = newProps[newPropName];
    }
  }
};

/**
 * Diffs two VNode children and modifies the DOM node based on the necessary changes
 * @param {HTMLElement} el - Target element to be modified
 * @param {VNode[]|undefined} oldVNodeChildren - Old VNode children
 * @param {VNode[]|undefined} newVNodeChildren - New VNode children
 */
export const patchChildren = (
  el: HTMLElement,
  oldVNodeChildren: VNode[] | undefined,
  newVNodeChildren: VNode[],
): void => {
  const childNodes = [...el.childNodes];
  /* istanbul ignore next */
  if (oldVNodeChildren) {
    for (let i = 0; i < oldVNodeChildren.length; ++i) {
      patch(<HTMLElement | Text>childNodes[i], newVNodeChildren[i], oldVNodeChildren[i]);
    }
  }
  /* istanbul ignore next */
  const slicedNewVNodeChildren = newVNodeChildren.slice(oldVNodeChildren?.length ?? 0);
  for (let i = 0; i < slicedNewVNodeChildren.length; ++i) {
    el.appendChild(createElement(slicedNewVNodeChildren[i], false));
  }
};

const replaceElementWithVNode = (el: HTMLElement | Text, newVNode: VNode): HTMLElement | Text => {
  if (typeof newVNode === 'string') {
    el.textContent = newVNode;
    return el;
  } else {
    const newElement = createElement(newVNode);
    el.replaceWith(newElement);
    return newElement;
  }
};

/**
 * Diffs two VNodes and modifies the DOM node based on the necessary changes
 * @param {HTMLElement|Text} el - Target element to be modified
 * @param {VNode} newVNode - New VNode
 * @param {VNode=} prevVNode - Previous VNode
 * @returns {HTMLElement|Text}
 */
export const patch = (
  el: HTMLElement | Text,
  newVNode: VNode,
  prevVNode?: VNode,
): HTMLElement | Text => {
  //没有新dom则直接移除老dom
  if (!newVNode) {
    // 删除当前dom本身
    // [Element.remove() - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove)
    el.remove();
    return el;
  }

  const oldVNode: VNode | undefined = prevVNode ?? el[OLD_VNODE_FIELD];
  const hasString = typeof oldVNode === 'string' || typeof newVNode === 'string';
  //如果是字符串类型，直接替换
  if (hasString && oldVNode !== newVNode) return replaceElementWithVNode(el, newVNode);
  if (!hasString) {
    if (
      (!(<VElement>oldVNode)?.key && !(<VElement>newVNode)?.key) ||
      (<VElement>oldVNode)?.key !== (<VElement>newVNode)?.key
    ) {
      //都有key且key不同才进行diff

      /* istanbul ignore if */
      if (
        (<VElement>oldVNode)?.tag !== (<VElement>newVNode)?.tag &&
        !(<VElement>newVNode).children &&
        !(<VElement>newVNode).props
      ) {
        //如果标签不同，直接全部替换
        // newVNode has no props/children is replaced because it is generally
        // faster to create a empty HTMLElement rather than iteratively/recursively
        // remove props/children
        return replaceElementWithVNode(el, newVNode);
      }
      //如果标签相同，则替换属性
      if (oldVNode && !(el instanceof Text)) {
        patchProps(el, (<VElement>oldVNode).props || {}, (<VElement>newVNode).props || {});

        /* istanbul ignore next */
        switch (<VFlags>(<VElement>newVNode).flag) {
          case VFlags.NO_CHILDREN:
            el.textContent = '';
            break;
          case VFlags.ONLY_TEXT_CHILDREN:
            el.textContent = <string>(<VElement>newVNode).children!.join('');
            break;
          default:
            //再替换子dom
            //本质还是递归patch
            patchChildren(el, (<VElement>oldVNode).children, (<VElement>newVNode).children!);
            break;
        }
      }
    }
  }

  if (!prevVNode) el[OLD_VNODE_FIELD] = newVNode;

  return el;
};
