`beforeEach(async () => { TestBed.configureTestingModule({ imports: [component] }); fixture = TestBed.createComponent(component); element = fixture.nativeElement; await fixture.whenStable(); });`
---
Write two tiny helpers: one that reads `element.querySelector('p')?.textContent?.trim()` and one that finds a button by its text among `element.querySelectorAll('button')`.
---
Assert with the `expect` you receive: `expect(countText()).toBe('Count: 2')`. Call `.click()` on the button element, then `await fixture.whenStable()`.
