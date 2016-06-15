
numbers = [
    ['animal', 145,216,246],
    ['illegalGarbage', 180,180,181],
    ['garbageStation', 118,196,123],
    ['graffiti', 240,180,79],
    ['damage', 89,87,87],
    ['streetlight', 245,239,142],
    ['kyun', 232,33,45],
    ['others', 255,255,255]
]


def myhex(n):
    chars = '0123456789abcdef'
    keta1 = n / 16
    keta2 = n % 16
    return chars[keta1] + chars[keta2]


for name, r, g, b in numbers:
    print '%s => #%s%s%s' % (
        name,
        myhex(r),
        myhex(g),
        myhex(b)
    )
